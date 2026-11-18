# Segurança do pacote

Este repositório entrega mods, configurações e lore para o launcher. Uma
alteração aqui chega ao computador de quem joga, então a regra é simples: **só
quem mantém o pacote pode escrever na branch principal**.

## Regras para o mantenedor

1. A branch `master` deve ter branch protection com pull request obrigatório,
   revisão do code owner, force push bloqueado e exclusão bloqueada.
2. As tags `v*` devem ter uma tag protection rule: release publicada não é
   movida nem apagada.
3. Só adicione como colaborador quem realmente precisa publicar. Jogador não
   precisa de permissão de escrita para jogar.
4. O `CODEOWNERS` cobre `Mods/`, `Lore/`, `pack.json` e `.github/`; ele só é
   aplicado se a branch protection exigir revisão do code owner.
5. O token de publicação é segredo do repositório ou do GitHub Actions. Nunca
   coloque token em `lore.json`, em `.txt`, em mod ou em arquivo do launcher.
6. Antes de aprovar um PR que mexa em `Mods/`, confira o jar e o manifest. O
   workflow `conferir` valida a estrutura, mas não prova que um jar é seguro.

## O que o launcher garante

- Baixa arquivos do repositório oficial e confere o SHA-1 de cada um contra o
  `manifest.json` da release.
- Recusa caminhos com `..` e só aplica as pastas que o pacote conhece.
- Não aceita escrever no GitHub e não altera a lore oficial.
- O editor de lore do jogador salva um rascunho **local**, no computador dele.

## O que o GitHub garante

Quem não é colaborador pode ler o repositório e abrir um pull request, mas não
consegue dar push, criar uma tag ou publicar uma release. A proteção de branch e
de tag é configurada nas opções do repositório; o `CODEOWNERS` sozinho não
impede um push direto.

## Relatar um problema

Abra uma issue privada ou fale com o mantenedor. Não publique token, endereço
interno ou detalhes de uma falha que ainda não foi corrigida.
