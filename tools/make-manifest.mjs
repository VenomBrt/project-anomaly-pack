/*
 * Gera o `manifest.json` que o launcher lê.
 *
 * Ele é a única coisa que o launcher confia: nome, versão e a impressão digital
 * (SHA-1) de cada arquivo. Com isso ele baixa só o que mudou e recusa o que
 * chegar diferente do combinado.
 *
 * Roda no GitHub Actions a cada tag (`v1.0.0`, `v1.1.0`, ...). Para publicar na
 * mão, rode `node tools/make-manifest.mjs` e anexe o `manifest.json` gerado à
 * release.
 */
import { createHash } from 'node:crypto'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['Mods', 'Config', 'Forcepack', 'NoTexture', 'NoMods', 'Server', 'Lore']
/** Nome do arquivo e pastas que não entram no pacote. */
const IGNORED = new Set(['README.md', '.gitkeep', '.DS_Store'])

const sha1 = (buffer) => createHash('sha1').update(buffer).digest('hex')

async function walk(dir, out) {
  let entries
  try {
    entries = await readdir(join(ROOT, dir), { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (IGNORED.has(entry.name) || entry.name.startsWith('.')) continue
    const path = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      await walk(path, out)
      continue
    }
    const file = join(ROOT, path)
    const info = await stat(file)
    if (!info.isFile()) continue
    out.push({ path: relative(ROOT, file).split('\\').join('/'), sha1: sha1(await readFile(file)), size: info.size })
  }
}

async function main() {
  const pack = JSON.parse(await readFile(join(ROOT, 'pack.json'), 'utf8'))
  const files = []
  for (const dir of DIRS) await walk(dir, files)
  files.sort((a, b) => a.path.localeCompare(b.path))

  const manifest = {
    pack: pack.pack ?? 'pacote',
    version: pack.version ?? '0.0.0',
    minecraft: pack.minecraft ?? null,
    forge: pack.forge ?? null,
    generatedAt: new Date().toISOString(),
    files
  }

  await writeFile(join(ROOT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`manifest.json: ${files.length} arquivo(s), versão ${manifest.version}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
