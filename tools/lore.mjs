#!/usr/bin/env node
/*
 * O painel de liberação da lore.
 *
 * A lore do launcher abre por partes, mas quem decide o dia é a equipe: não há
 * agenda automática. A chave é `Lore/capitulos.txt` — `true` abre, `false`
 * lacra. Este script lê e escreve esse arquivo, e ajuda a criar uma seção nova.
 *
 * Uso:
 *   node tools/lore.mjs                       o estado de cada capítulo
 *   node tools/lore.mjs abrir iv              abre o capítulo IV
 *   node tools/lore.mjs fechar iv             lacra o capítulo IV
 *   node tools/lore.mjs nova cap-xiii "O QUE ACONTECEU DEPOIS"
 *                                             cria uma seção nova, lacrada
 *
 * Depois de mexer, é só enviar a mudança. O workflow `publicar lore` gera o
 * manifest e publica a release; o launcher recebe na próxima sincronização.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LORE = join(ROOT, 'Lore', 'lore.json')
const CHAPTERS = join(ROOT, 'Lore', 'capitulos.txt')
const TEXT_DIR = join(ROOT, 'Lore', 'texto')
const SAFE_ID = /^[a-z0-9-]+$/

const ROMAN = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
const ALIASES = {
  'nota introdutoria sobre a integridade dos documentos': 'introducao',
  intro: 'introducao',
  nota: 'introducao',
  'declaracao de encerramento': 'encerramento'
}

const plain = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

function romanToNumber(text) {
  let total = 0
  const letters = String(text ?? '').toLowerCase()
  for (let index = 0; index < letters.length; index += 1) {
    const value = ROMAN[letters[index]]
    if (!value) return 0
    const next = ROMAN[letters[index + 1]] ?? 0
    total += value < next ? -value : value
  }
  return total
}

/** O nome que o `capitulos.txt` usa para uma seção. */
function chapterKey(raw) {
  const text = plain(raw).replace(/[\s_-]+/g, ' ')
  if (ALIASES[text]) return ALIASES[text]
  const match = /^(?:(?:cap|capitulo|chapter)\s*)?(\d+|[ivxlcdm]+)$/.exec(text)
  if (match) {
    const token = match[1]
    const number = /^\d+$/.test(token) ? Number(token) : romanToNumber(token)
    if (number > 0) return `capitulo ${number}`
  }
  return text.replace(/[\s_]+/g, '-')
}

function chapterOrder(key) {
  if (key === 'introducao') return -1
  if (key === 'encerramento') return 10_000
  const match = /^capitulo\s+(\d+)$/.exec(key)
  return match ? Number(match[1]) : 2_000
}

function parseChapters(text) {
  const chapters = new Map()
  text.split(/\r?\n/).forEach((line) => {
    const content = line.replace(/#.*/, '').trim()
    if (content.length === 0) return
    const split = content.search(/[=:]/)
    if (split === -1) return
    const key = chapterKey(content.slice(0, split).trim())
    const value = plain(content.slice(split + 1))
    chapters.set(key, ['true', 'sim', 's', '1', 'aberto', 'aberta', 'liberado', 'liberada', 'on', 'yes'].includes(value))
  })
  return chapters
}

function serializeChapters(chapters) {
  const keys = [...chapters.keys()].sort((a, b) => {
    const order = chapterOrder(a) - chapterOrder(b)
    return order !== 0 ? order : a.localeCompare(b)
  })
  return [
    '# O launcher lê este arquivo para saber o que já pode ser lido.',
    '# true = aberto; false = lacrado. A lista é a única chave: não há agenda.',
    '#',
    '# Só o dono e os admins do repositório publicam mudanças aqui. Para abrir um',
    '# capítulo, troque o false por true e envie; a release automática cuida do',
    '# resto e todos os launchers recebem na próxima sincronização.',
    '',
    ...keys.map((key) => `${key} = ${chapters.get(key) ? 'true' : 'false'}`),
    ''
  ].join('\n')
}

async function loadChapters() {
  try {
    return parseChapters(await readFile(CHAPTERS, 'utf8'))
  } catch {
    return new Map()
  }
}

async function saveChapters(chapters) {
  await writeFile(CHAPTERS, serializeChapters(chapters), 'utf8')
}

async function loadLore() {
  return JSON.parse(await readFile(LORE, 'utf8'))
}

async function saveLore(data) {
  await writeFile(LORE, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function sectionKey(section) {
  return chapterKey(section.numeral && romanToNumber(section.numeral) > 0 ? section.numeral : section.id)
}

async function status() {
  const data = await loadLore()
  const chapters = await loadChapters()
  const sections = data.archive?.sections ?? []

  console.log('liberação da lore — sem agenda; quem abre é a equipe\n')
  for (const section of sections) {
    const key = sectionKey(section)
    const open = chapters.get(key) === true
    console.log(`  ${open ? 'aberto ' : 'lacrado'}  ${key.padEnd(14)} ${section.title ?? section.id}`)
  }

  const known = new Set(sections.map(sectionKey))
  const extra = [...chapters.keys()].filter((key) => !known.has(key))
  if (extra.length > 0) {
    console.log(`\nfora do índice (ignorado pelo launcher): ${extra.join(', ')}`)
  }
  console.log('\nlembre: envie a mudança; o workflow publica a release sozinho.')
}

async function setChapter(id, open) {
  if (!id) throw new Error('diga qual capítulo: node tools/lore.mjs abrir iv')
  const chapters = await loadChapters()
  const key = chapterKey(id)
  chapters.set(key, open)
  await saveChapters(chapters)
  console.log(`${key}: ${open ? 'aberto' : 'lacrado'}.`)
  console.log('envie a mudança; o workflow publica a release sozinho.')
}

async function newSection(id, title) {
  if (!id) throw new Error('diga o id da seção: node tools/lore.mjs nova cap-xiii "O TÍTULO"')
  if (!title) throw new Error('diga o título da seção entre aspas.')
  if (!SAFE_ID.test(id)) {
    throw new Error('use só letras minúsculas, números e hífen no id (ex.: cap-xiii).')
  }

  const data = await loadLore()
  const existing = data.archive?.sections ?? []
  if (existing.some((section) => section.id === id)) {
    throw new Error(`já existe uma seção com o id "${id}".`)
  }

  const file = `texto/${id}.txt`
  const target = join(ROOT, 'Lore', file)
  try {
    await readFile(target, 'utf8')
    throw new Error(`o arquivo Lore/${file} já existe.`)
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  await mkdir(TEXT_DIR, { recursive: true })
  await writeFile(
    target,
    ['::dateline RIVER PINES, 19__', '', '::source Registro arquivado pela prefeitura de River Pines.', '', '[ESCREVA AQUI]', ''].join('\n'),
    'utf8'
  )

  const section = { id, numeral: null, title, source: 'arquivo', file }
  data.archive = {
    ...(data.archive ?? {
      title: 'RIVER PINES: O ARQUIVO DOS DESAPARECIDOS',
      subtitle: '',
      source: '',
      sections: []
    })
  }
  data.archive.sections = [...existing, section]
  await saveLore(data)

  const chapters = await loadChapters()
  chapters.set(chapterKey(id), false)
  await saveChapters(chapters)

  console.log(`seção "${id}" criada em ${file} e lacrada.`)
  console.log('escreva o texto em Lore/texto/ e troque o "[ESCREVA AQUI]".')
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  if (!command || command === 'status') return status()
  if (command === 'abrir') return setChapter(rest[0], true)
  if (command === 'fechar') return setChapter(rest[0], false)
  if (command === 'nova') return newSection(rest[0], rest.slice(1).join(' '))
  console.log('comandos: status · abrir <id> · fechar <id> · nova <id> "<título>"')
}

main().catch((error) => {
  console.error(`erro: ${error.message}`)
  process.exitCode = 1
})
