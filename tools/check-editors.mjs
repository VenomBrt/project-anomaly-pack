/*
 * Quem pode publicar a lore?
 *
 * O workflow chama este script antes de gerar a release. Ele lê
 * `Lore/editores.txt` e compara com `GITHUB_ACTOR`, que é quem enviou o commit.
 * Se o nome não estiver na lista, a release não é publicada.
 *
 * Isto é uma segunda fechadura, não a primeira: quem não tem permissão de
 * escrita no repositório já não consegue enviar a mudança. A lista serve para
 * deixar explícito quem da equipe pode transformar uma edição em release.
 *
 * Uso:
 *   GITHUB_ACTOR=VenomBrt node tools/check-editors.mjs
 */
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FILE = join(ROOT, 'Lore', 'editores.txt')

function readEditors(text) {
  const names = []
  text.split(/\r?\n/).forEach((line, index) => {
    const content = line.replace(/#.*/, '').trim()
    if (content.length === 0) return
    const name = content.replace(/^@/, '')
    if (!/^[A-Za-z0-9-]{1,39}$/.test(name)) {
      throw new Error(`Lore/editores.txt, linha ${index + 1}: "${content}" não é um usuário do GitHub.`)
    }
    names.push(name.toLowerCase())
  })
  return names
}

const actor = (process.env.GITHUB_ACTOR ?? '').trim().replace(/^@/, '').toLowerCase()
if (actor.length === 0) {
  console.error('GITHUB_ACTOR não foi definido; não dá para saber quem está publicando.')
  process.exit(1)
}

let text
try {
  text = await readFile(FILE, 'utf8')
} catch {
  console.error('Lore/editores.txt não existe; a publicação automática está fechada.')
  process.exit(1)
}

try {
  const editors = readEditors(text)
  if (editors.length === 0) {
    console.error('Lore/editores.txt está vazio; ninguém pode publicar a lore.')
    process.exit(1)
  }
  if (!editors.includes(actor)) {
    console.error(`@${actor} não está em Lore/editores.txt. A release não foi publicada.`)
    console.error(`Editores: ${editors.map((name) => `@${name}`).join(', ')}`)
    process.exit(1)
  }
  console.log(`publicando como @${actor}; ${editors.length} editor(es) autorizado(s).`)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
