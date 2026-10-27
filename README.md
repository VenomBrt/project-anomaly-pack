# Project: Anomaly — pacote do servidor

Este repositório é o que o launcher baixa. Ele não tem código: tem o conteúdo que
define o cliente do servidor — mods, configs, texturas, servidor e lore.

## Baixar o launcher

O link do jogador é sempre o mesmo:

**https://venombrt.github.io/project-anomaly-releases/**

A página reconhece o sistema e entrega o `.exe` (Windows) ou o `.AppImage` e o
`.deb` (Linux). Os instaladores ficam no repositório de downloads, não aqui: este
repositório só tem conteúdo, e é por isso que ele pode ser aberto sem expor o
programa.

**Toda publicação aqui vira atualização no launcher.** O launcher consulta a
release mais recente ao abrir e ao clicar em acessar, compara as impressões
digitais e baixa só o que mudou. Quem já está jogando recebe no próximo clique.

## O que tem em cada pasta

| Pasta | O que faz |
| --- | --- |
| `Mods/` | Os mods que vão ser instalados (`.jar`). **O conjunto é exato**: jar que não está aqui é removido da pasta `mods` do jogador. |
| `NoMods/` | `list.txt` com mods proibidos (nome com ou sem `.jar`). Vence tudo: mesmo que apareça em `Mods/`, não carrega. |
| `Config/` | Configs prontas. A árvore de pastas é copiada igual para `config/` do jogo. |
| `Forcepack/` | Packs de textura forçados (`.zip` com `pack.mcmeta`). Vão para `resourcepacks/` e para o topo do `options.txt` — ninguém consegue desligar. |
| `NoTexture/` | `list.txt` com packs proibidos. O launcher apaga o arquivo e tira do `options.txt`. |
| `Server/` | `server.json` com `address`, `port` e `autoJoin`. Com `autoJoin: true`, o jogo abre já entrando no servidor. |
| `Lore/` | `lore.json` com o documento do Arquivo, o censo de cada estágio e a **agenda de liberação** das seções. |

Arquivos `README.md`, `.gitkeep` e pastas começando com `.` são ignorados — não
viram conteúdo do pacote.

## Antes de publicar: o checklist

1. **Os mods são da mesma versão** do launcher (1.20.1 · Forge 47.4.0). Se o
   `pack.json` declarar outra versão, o launcher **recusa o pacote inteiro** e
   escreve o motivo na tela — mods não carregam em versão errada.
2. Os mods estão em `Mods/` e são `.jar` (não `.zip`, não `.jar.txt`).
3. Os packs de textura estão em `Forcepack/`, são `.zip` e têm `pack.mcmeta`
   dentro. Um pack sem `pack.mcmeta` não carrega no Minecraft.
4. As configs estão em `Config/`, na mesma árvore que o jogo espera
   (`Config/create-server.toml` → `config/create-server.toml`).
5. Se o servidor já está de pé: `Server/server.json` com `address`, `port` e
   `autoJoin: true` — é o que faz o jogo abrir entrando direto.
6. A `version` do `pack.json` combina com a tag que você vai publicar
   (`"version": "1.1.0"` ↔ tag `v1.1.0`).
7. Nenhum arquivo passa de 100 MB (limite do GitHub por arquivo).

## Como publicar uma atualização

1. Edite os arquivos nas pastas (pelo site do GitHub ou por commit).
2. Suba a `version` do `pack.json` (ex.: `1.0.0` → `1.1.0`).
3. Crie uma tag com a mesma versão: `v1.1.0`, e publique a release.

O Actions gera o `manifest.json` — nome, versão e SHA-1 de cada arquivo — e anexa
à release. É esse manifest que o launcher lê: sem ele, nada é aplicado.

Dá para publicar sem tag: **Actions → release → Run workflow**, informando a tag.
Se preferir sem Actions, rode `node tools/make-manifest.mjs`, crie a release na
mão e anexe o `manifest.json` gerado.

## O que o GitHub confere sozinho

- **`conferir`** roda a cada envio e a cada pull request: valida as pastas e
  mostra ✅ ou ❌ com o motivo. Não publica nada.
- **`release`** roda quando entra uma tag `v*`: confere o pacote mais uma vez,
  **exige que a tag bata com a `version` do `pack.json`** e publica a release com
  o `manifest.json` anexado.

Para conferir na sua máquina (opcional, precisa de Node 20+):
`node tools/make-manifest.mjs --check`.

## Exemplos

### `Server/server.json`

```json
{
  "address": "play.seuservidor.net",
  "port": 25565,
  "autoJoin": true
}
```

`address` vazio = o jogo abre sem entrar em servidor nenhum. Com `autoJoin: true`
o endereço é obrigatório (a conferência recusa sem ele).

### `Lore/lore.json`

O documento inteiro do Arquivo (`archive`) e/ou os números dos estágios:

```json
{
  "stages": {
    "1948": { "stamp": "1948", "population": 82 },
    "1967": { "stamp": "02/07/1967", "population": 426 }
  },
  "liberacao": {
    "novo-capitulo": "2026-11-22"
  },
  "archive": {
    "title": "RIVER PINES: O ARQUIVO DOS DESAPARECIDOS",
    "subtitle": "...",
    "source": "...",
    "sections": [
      {
        "id": "novo-capitulo",
        "numeral": "VII",
        "title": "O QUE FICOU FORA DO REGISTRO",
        "source": "log",
        "blocks": [
          { "kind": "dateline", "text": "RIVER PINES, 1967" },
          { "kind": "para", "text": "..." }
        ]
      }
    ]
  }
}
```

Tipos de bloco: `title`, `dateline`, `source`, `head`, `para`, `transcript`,
`entry` (com `at` para a data). Fontes: `registro`, `jornal`, `log`,
`transcricao`, `arquivo`.

## A lore abre por partes

A lore não chega toda de uma vez. Cada seção do Arquivo tem um dia de liberação:
antes disso ela aparece **lacrada** na tela — o número, o selo e a data, sem o
texto. Quem decide é o bloco `liberacao` do `Lore/lore.json`, e é só ele que
precisa ser editado para ir soltando a história:

```json
"liberacao": {
  "nota-introdutória-sobre-a-integridade-dos-documentos": "2026-11-01",
  "i": "2026-11-01",
  "iv": "2026-11-22"
}
```

- **O id é o da seção.** As que vêm dentro do launcher são
  `nota-introdutória-sobre-a-integridade-dos-documentos`, `i`, `ii`, `iii`, `iv`,
  `v`, `vi`, `vii`, `viii`, `ix`, `x`, `xi`, `xii` e `declaração-de-encerramento`.
- **Sem data, a seção está aberta.** Id que não existe é ignorado — o pacote pode
  ser mais novo que o launcher.
- **A data é local e vira à meia-noite.** `2026-11-08` abre no dia 8, para todo
  mundo, sem ninguém precisar baixar nada de novo.
- **A agenda viaja junto com a release.** Depois de mexer, suba a `version` do
  `pack.json` e publique a tag; a partir daí as aberturas acontecem sozinhas.

Para ver a agenda de hoje em diante (opcional, precisa de Node 20+):

```
node tools/lore.mjs                       # a agenda
node tools/lore.mjs abrir iv              # abre agora
node tools/lore.mjs abrir iv 2026-11-22   # agenda para o dia 22
```

### Escrever lore nova

Lore nova não precisa de launcher novo: entra em `archive.sections` do
`Lore/lore.json`, junto com a data dela na agenda. `node tools/lore.mjs nova
cap-xiii "O QUE ACONTECEU DEPOIS"` cria o esqueleto — nasce lacrada por uma
semana, para dar tempo de escrever — e é só preencher os blocos.

Uma seção com o **mesmo `id`** de uma que já existe substitui a do launcher, o
que serve para corrigir um nome ou reescrever um parágrafo. Um `id` novo entra
no fim do arquivo.
## O que o launcher faz com isso

- Baixa só os arquivos cuja impressão digital mudou.
- Recusa arquivo que chegue diferente do manifest.
- Confere `minecraft` e `forge` do `pack.json` contra a versão que ele abre. Se
  não bater, **não aplica nada** e diz o motivo na tela.
- Aplica antes de abrir o jogo; se o pacote já estava instalado e a conferência
  falhar por rede, o jogo **não** abre com cliente desatualizado.
- Nunca escreve fora das pastas do jogo: caminhos com `..` são descartados.

## Erros comuns

| O que apareceu | O que era |
| --- | --- |
| `Mods/x.txt: a pasta Mods/ aceita só .jar` | Arquivo errado na pasta dos mods. Tire de lá ou corrija a extensão. |
| `Forcepack/x.zip: não tem pack.mcmeta dentro` | O zip não é um pack de textura do Minecraft (ou foi compactado com a pasta dentro — o `pack.mcmeta` precisa estar na raiz do zip). |
| `a tag v1.1.0 não bate com a versão 1.0.0 do pack.json` | Suba a `version` no `pack.json` ou crie a tag com a versão que está lá. |
| `com "autoJoin": true é preciso um endereço` | Preencha o `address` ou desligue o `autoJoin`. |
| O jogador entrou e os mods não carregaram | O `pack.json` declara outra versão de Minecraft/Forge, ou o mod é de outra versão. |
