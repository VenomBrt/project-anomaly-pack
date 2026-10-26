/*
 * Gera o `manifest.json` que o launcher lê — e confere o pacote antes disso.
 *
 * O manifest é a única coisa que o launcher confia: nome, versão e a impressão
 * digital (SHA-1) de cada arquivo. Com ele o launcher baixa só o que mudou e
 * recusa qualquer arquivo que chegue diferente do combinado.
 *
 * Este script também é o revisor do repositório. Cada pasta tem uma regra, e
 * arquivo que não serve para nada ali vira aviso ou erro em vez de virar mod
 * quebrado na máquina do jogador:
 *
 *   Mods/        .jar (o resto é erro: o launcher copia a pasta inteira)
 *   Config/      qualquer arquivo (vai para config/ do jogo, igual à árvore)
 *   Forcepack/   .zip com pack.mcmeta dentro (pack de textura inválido não carrega)
 *   NoMods/      list.txt
 *   NoTexture/   list.txt
 *   Server/      server.json (address, port, autoJoin)
 *   Lore/        lore.json
 *
 * Uso:
 *   node tools/make-manifest.mjs                      gera o manifest.json
 *   node tools/make-manifest.mjs --check               só confere (usado na CI)
 *   node tools/make-manifest.mjs --expect-version v1.1.0
 *                                                     exige que a tag bata com
 *                                                     a versão do pack.json
 *
 * Sai com código 1 quando há erro: nada é publicado com o pacote quebrado.
 */
import { createHash } from 'node:crypto'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
/** Nomes que nunca entram no pacote, em qualquer pasta. */
const IGNORED = new Set(['README.md', 'LEIA-ME.md', '.gitkeep', '.DS_Store', 'Thumbs.db'])

/**
 * A regra de cada pasta.
 *
 * `ext` é a extensão obrigatória (lista vazia = qualquer uma), `only` são os
 * únicos nomes aceitos, `json` exige JSON válido e `needs` é o texto que o
 * arquivo precisa conter por dentro (o zip de textura carrega o pack.mcmeta no
 * próprio índice, então procurá-lo nos bytes basta para pegar o zip errado).
 */
const RULES = {
  Mods: { ext: ['.jar'] },
  Config: { ext: [] },
  Forcepack: { ext: ['.zip'], needs: 'pack.mcmeta' },
  NoMods: { only: ['list.txt'] },
  NoTexture: { only: ['list.txt'] },
  Server: { only: ['server.json'], json: true },
  Lore: { only: ['lore.json'], json: true }
}
const DIRS = Object.keys(RULES)

const errors = []
const warnings = []
const files = []
const counts = new Map()

const sha1 = (buffer) => createHash('sha1').update(buffer).digest('hex')
const bad = (message) => errors.push(message)
const warn = (message) => warnings.push(message)

function arg(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? null : (process.argv[index + 1] ?? '')
}

/** O valor do servidor, para avisar quando o endereço estiver vazio. */
function checkServerJson(text, path) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    bad(`${path}: não é JSON válido (${error.message}).`)
    return
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    bad(`${path}: o arquivo precisa ser um objeto com address, port e autoJoin.`)
    return
  }
  const address = typeof parsed.address === 'string' ? parsed.address.trim() : ''
  const port = parsed.port === undefined ? 25565 : Number(parsed.port)
  if (address.length > 0 && (!Number.isFinite(port) || port < 1 || port > 65535)) {
    bad(`${path}: a porta ${String(parsed.port)} não existe. Use de 1 a 65535, ou deixe sem "port".`)
  }
  if (address.length === 0) {
    if (parsed.autoJoin === true) {
      bad(`${path}: com "autoJoin": true é preciso um endereço. Preencha "address" ou desligue o autoJoin.`)
      return
    }
    console.log(`servidor: sem endereço — o jogo abre sem entrar em servidor nenhum (é só preencher quando o servidor estiver de pé).`)
    return
  }
  if (parsed.autoJoin === true) {
    console.log(`servidor: o jogo vai abrir entrando em ${address}:${port}`)
  }
}

async function walk(dir, out, rule = RULES[dir]) {
  let entries
  try {
    entries = await readdir(join(ROOT, dir), { withFileTypes: true })
  } catch {
    // Pasta que não existe é pasta vazia: o pacote só não tem nada dela.
    return
  }
  // A regra vale para a árvore inteira: subpasta de `Config/` continua sendo
  // config, e subpasta de `Mods/` continua aceitando só jar.
  const root = rule.root ?? dir

  for (const entry of entries) {
    if (IGNORED.has(entry.name) || entry.name.startsWith('.')) continue
    const path = `${dir}/${entry.name}`

    if (entry.isDirectory()) {
      await walk(path, out, { ...rule, root })
      continue
    }
    if (!entry.isFile()) continue

    if (rule.only && !rule.only.includes(entry.name)) {
      warn(`${path}: ignorado. A pasta ${root}/ só lê ${rule.only.join(', ')}.`)
      continue
    }
    if (rule.ext && rule.ext.length > 0) {
      const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase()
      if (!rule.ext.includes(ext)) {
        bad(`${path}: a pasta ${root}/ aceita só ${rule.ext.join(', ')}.`)
        continue
      }
    }

    const file = join(ROOT, path)
    const info = await stat(file)
    const buffer = await readFile(file)

    if (rule.json) {
      if (path === 'Server/server.json') checkServerJson(buffer.toString('utf8'), path)
      else {
        try {
          JSON.parse(buffer.toString('utf8'))
        } catch (error) {
          bad(`${path}: não é JSON válido (${error.message}).`)
          continue
        }
      }
    }
    if (rule.needs && !buffer.includes(rule.needs)) {
      bad(`${path}: não tem ${rule.needs} dentro. Isso não é um pack de textura do Minecraft.`)
      continue
    }

    counts.set(root, (counts.get(root) ?? 0) + 1)
    out.push({
      path: relative(ROOT, file).split('\\').join('/'),
      sha1: sha1(buffer),
      size: info.size
    })
  }
}

function report() {
  const resumo = DIRS.filter((dir) => counts.get(dir)).map((dir) => `${dir}: ${counts.get(dir)}`)
  console.log(`  ${files.length} arquivo(s)${resumo.length > 0 ? ` — ${resumo.join(' · ')}` : ''}`)
  for (const item of warnings) console.log(`  aviso: ${item}`)
  for (const item of errors) console.log(`  ERRO: ${item}`)
}

async function main() {
  const check = process.argv.includes('--check')
  const expectVersion = arg('--expect-version')

  const pack = JSON.parse(await readFile(join(ROOT, 'pack.json'), 'utf8'))
  const version = typeof pack.version === 'string' ? pack.version.trim() : ''
  if (version.length === 0) bad('pack.json: falta a "version".')

  if (expectVersion) {
    const tag = expectVersion.replace(/^v/, '')
    if (tag !== version) {
      bad(
        `a tag ${expectVersion} não bate com a versão ${version} do pack.json. ` +
          `Suba a "version" do pack.json (ex.: ${tag}) ou crie a tag certa — e publique de novo.`
      )
    }
  }

  for (const dir of DIRS) await walk(dir, files)
  files.sort((a, b) => a.path.localeCompare(b.path))

  console.log(`pacote: ${pack.pack ?? 'pacote'} ${version} · minecraft ${pack.minecraft ?? '—'} · forge ${pack.forge ?? '—'}`)
  report()

  if (errors.length > 0) {
    console.log(`\n${errors.length} erro(s): nada foi gerado.`)
    process.exitCode = 1
    return
  }
  if (files.length === 0) warn('o pacote está vazio: nenhum mod, config, textura ou lore para aplicar.')

  if (check) {
    console.log('\npacote conferido (nada foi escrito).')
    return
  }

  const manifest = {
    pack: pack.pack ?? 'pacote',
    version,
    minecraft: pack.minecraft ?? null,
    forge: pack.forge ?? null,
    generatedAt: new Date().toISOString(),
    files
  }
  await writeFile(join(ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`\nmanifest.json gerado: versão ${version}, ${files.length} arquivo(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
