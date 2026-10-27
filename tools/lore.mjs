#!/usr/bin/env node
/*
 * A agenda da lore.
 *
 * A lore do launcher abre por partes: cada seção do Arquivo tem um dia, e o que
 * ainda não chegou aparece lacrado na tela. Este script só mexe nesse bloco do
 * `Lore/lore.json` — nada aqui publica nada, e a agenda vale depois da próxima
 * release, como qualquer outra edição do pacote.
 *
 * Uso:
 *   node tools/lore.mjs                       a agenda de hoje em diante
 *   node tools/lore.mjs abrir iv              libera a seção IV agora
 *   node tools/lore.mjs abrir iv 2026-11-22   agenda a seção IV para o dia 22
 *   node tools/lore.mjs nova cap-xiii "O QUE ACONTECEU DEPOIS"
 *                                             cria uma seção para escrever
 */
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = join(ROOT, 'Lore', 'lore.json')
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (value) => String(value).padStart(2, '0')
const today = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** A data existe no calendário? 31 de fevereiro não existe. */
function realDay(value) {
  const match = typeof value === 'string' ? DAY.exec(value.trim()) : null
  if (!match) return null
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  const ok =
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day)
  return ok ? `${year}-${month}-${day}` : null
}

const daysBetween = (from, to) => Math.round((new Date(to) - new Date(from)) / 86_400_000)

async function load() {
  return JSON.parse(await readFile(FILE, 'utf8'))
}

async function save(data) {
  await writeFile(FILE, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function agenda(data) {
  return data.liberacao && typeof data.liberacao === 'object' ? data.liberacao : {}
}

/** A lista da agenda, do dia mais próximo para o mais distante. */
function status(data) {
  const entries = Object.entries(agenda(data)).sort((a, b) => String(a[1]).localeCompare(String(b[1])))
  const now = today()

  if (entries.length === 0) {
    console.log('agenda vazia: toda a lore que o launcher conhece está aberta.')
  } else {
    console.log(`agenda da lore — hoje é ${now}\n`)
    for (const [id, day] of entries) {
      const date = realDay(day)
      if (!date) {
        console.log(`  !!  ${id}: "${day}" não é uma data (use AAAA-MM-DD)`)
        continue
      }
      const restam = daysBetween(now, date)
      const estado =
        restam > 0 ? `lacrada · abre em ${restam} dia${restam === 1 ? '' : 's'}` : 'aberta'
      console.log(`  ${date}  ${id}  —  ${estado}`)
    }

    const abertas = entries.filter(([, day]) => realDay(day) && realDay(day) <= now).length
    console.log(`\n${abertas} de ${entries.length} seções liberadas.`)
  }

  const extras = (data.archive?.sections ?? []).map((section) => section.id).filter(Boolean)
  if (extras.length > 0) {
    console.log(`\nlore nova neste pacote: ${extras.join(', ')}`)
  }
  console.log('\nlembre: só chega ao jogador depois de subir a "version" do pack.json e publicar a tag.')
}

function abrir(data, id, day) {
  if (!id) throw new Error('diga qual seção: node tools/lore.mjs abrir iv')
  const when = day ? realDay(day) : today()
  if (!when) throw new Error(`"${day}" não é uma data. Use AAAA-MM-DD, ex.: 2026-11-22.`)

  data.liberacao = { ...agenda(data), [id]: when }
  return save(data).then(() => {
    const restam = daysBetween(today(), when)
    if (restam > 0) console.log(`${id}: lacrada até ${when} (${restam} dia${restam === 1 ? '' : 's'}).`)
    else console.log(`${id}: aberta a partir de ${when}.`)
    console.log('suba a "version" do pack.json e publique a tag para isso valer no launcher.')
  })
}

function nova(data, id, title) {
  if (!id) throw new Error('diga o id da seção: node tools/lore.mjs nova cap-xiii "O TÍTULO"')
  if (!title) throw new Error('diga o título da seção entre aspas.')

  const existentes = data.archive?.sections ?? []
  if (existentes.some((section) => section.id === id)) {
    throw new Error(`já existe uma seção com o id "${id}".`)
  }

  const section = {
    id,
    numeral: null,
    title,
    source: 'arquivo',
    blocks: [
      { kind: 'dateline', text: 'RIVER PINES, 19__' },
      { kind: 'source', text: 'Registro arquivado pela prefeitura de River Pines.' },
      { kind: 'para', text: '[ESCREVA AQUI]' }
    ]
  }

  data.archive = { ...(data.archive ?? { title: 'RIVER PINES: O ARQUIVO DOS DESAPARECIDOS', subtitle: '', source: '', sections: [] }) }
  data.archive.sections = [...existentes, section]

  // Nasce lacrada por uma semana: dá tempo de escrever antes de alguém ler.
  const daqui = new Date()
  daqui.setDate(daqui.getDate() + 7)
  const when = `${daqui.getFullYear()}-${pad(daqui.getMonth() + 1)}-${pad(daqui.getDate())}`
  data.liberacao = { ...agenda(data), [id]: when }

  return save(data).then(() => {
    console.log(`seção "${id}" criada em archive.sections, lacrada até ${when}.`)
    console.log('escreva os blocos em Lore/lore.json e troque o "[ESCREVA AQUI]".')
  })
}

async function main() {
  const [command, ...rest] = process.argv.slice(2)
  const data = await load()

  if (!command || command === 'status') return status(data)
  if (command === 'abrir') return abrir(data, rest[0], rest[1])
  if (command === 'nova') return nova(data, rest[0], rest.slice(1).join(' '))

  console.log('comandos: status · abrir <id> [data] · nova <id> "<título>"')
}

main().catch((error) => {
  console.error(`erro: ${error.message}`)
  process.exitCode = 1
})
