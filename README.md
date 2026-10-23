# Project: Anomaly — pacote do servidor

Este repositório é o que o launcher baixa. Ele não tem código: tem o conteúdo que
define o cliente do servidor — mods, configs, texturas, servidor e lore.

**Toda publicação aqui vira atualização no launcher.** O launcher consulta a
release mais recente ao abrir e ao clicar em acessar, compara as impressões
digitais e baixa só o que mudou.

## Como publicar uma atualização

1. Edite os arquivos nas pastas abaixo (pelo site do GitHub ou por commit).
2. Suba a `version` do `pack.json` (ex.: `1.0.0` → `1.1.0`).
3. Crie uma tag com a mesma ideia: `v1.1.0` e publique a release.

O Actions gera o `manifest.json` (nome, versão e SHA-1 de cada arquivo) e anexa à
release. É esse manifest que o launcher lê. Sem ele, nada é aplicado.

Se precisar publicar sem Actions: rode `node tools/make-manifest.mjs`, crie a
release na mão e anexe o `manifest.json` gerado.

> A tag e o `pack.json` não precisam ser idênticos, mas manter iguais evita
> confusão: a tag é a identidade da release, a versão é o que aparece na tela.

## As pastas

| Pasta | O que faz |
| --- | --- |
| `Mods/` | Os mods que vão ser instalados. **O conjunto é exato**: jar que não está aqui é removido da pasta `mods` do jogador. |
| `NoMods/` | `list.txt` com mods proibidos (nome com ou sem `.jar`). Vence tudo: mesmo que apareça em `Mods/`, não carrega. |
| `Config/` | Configs forçadas. A estrutura de pastas é copiada igual para `config/` do jogo. |
| `Forcepack/` | Packs de textura forçados (`.zip`). Vão para `resourcepacks/` e para o topo do `options.txt`. |
| `NoTexture/` | `list.txt` com packs proibidos. O launcher apaga o arquivo e tira do `options.txt`. |
| `Server/` | `server.json` com `address`, `port` e `autoJoin`. Com `autoJoin: true`, o jogo abre já entrando no servidor. `address` vazio = sem entrada automática. |
| `Lore/` | `lore.json` com a lore do launcher: o documento do Arquivo, os carimbos e o censo de cada estágio. |

### `Server/server.json`

```json
{
  "address": "play.seuservidor.net",
  "port": 25565,
  "autoJoin": true
}
```

### `Lore/lore.json`

O documento inteiro do Arquivo (`archive`) e/ou os números dos estágios:

```json
{
  "stages": {
    "1948": { "stamp": "1948", "population": 82 },
    "1967": { "stamp": "02/07/1967", "population": 426 }
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

## O que o launcher faz com isso

- Baixa só os arquivos cuja impressão digital mudou.
- Recusa arquivo que chegue diferente do manifest.
- Aplica antes de abrir o jogo; se o pacote já estava instalado e a conferência
  falhar por rede, o jogo **não** abre com cliente desatualizado.
- Nunca escreve fora das pastas do jogo: caminhos com `..` são descartados.
