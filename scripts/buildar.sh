#!/usr/bin/env bash
# Uso: bash scripts/buildar.sh ios   |   bash scripts/buildar.sh android
#
# O ÚNICO jeito aprovado de gerar build do EAS (gasta cota). Em 11/10/2026 um
# `git pull` falhou calado (mudança local em package.json) e 4 builds saíram da
# versão antiga. Este script PARA na primeira coisa estranha e só gasta depois
# de mostrar exatamente o que vai ser gerado.
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH_ESPERADA="claude/laughing-keller-my8t7c"

PLATAFORMA="${1:-}"
if [[ "$PLATAFORMA" != "ios" && "$PLATAFORMA" != "android" ]]; then
  echo "Uso: bash scripts/buildar.sh ios   ou   bash scripts/buildar.sh android"
  exit 1
fi

echo "— Conferindo o repositório…"

# 1. Branch certa (buildar de outra branch gera app com código que ninguém revisou).
BRANCH_ATUAL=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH_ATUAL" != "$BRANCH_ESPERADA" ]]; then
  echo ""
  echo "✋ PAREI: você está na branch '$BRANCH_ATUAL', e o build sai da '$BRANCH_ESPERADA'."
  echo "Pra voltar:  git checkout $BRANCH_ESPERADA   e rode este script de novo."
  exit 1
fi

# 2. Nada de mudança local em arquivo versionado — foi isso que fez o pull falhar calado.
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo ""
  echo "✋ PAREI: tem mudança local nestes arquivos:"
  git status --porcelain --untracked-files=no
  echo ""
  echo "Ninguém edita arquivo direto nesta pasta — isso veio de algum acidente."
  echo "Pra descartar e voltar ao que está no GitHub:  git checkout -- ."
  echo "Depois rode este script de novo."
  exit 1
fi

# 3. Pull que não passa calado: qualquer erro mata o script aqui.
git pull --ff-only

# 4. Confere que o local ficou IGUAL ao GitHub (sem commit perdido pra trás).
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse "origin/$BRANCH_ESPERADA")" ]]; then
  echo ""
  echo "✋ PAREI: mesmo depois do pull, o código local não é igual ao do GitHub."
  echo "Me chama no chat com esta tela que eu resolvo."
  exit 1
fi

# 5. Sem .easignore o upload passa de 500 MB (vídeos do docs/) e pode falhar por disco.
if [[ ! -f .easignore ]]; then
  echo "✋ PAREI: .easignore sumiu — o upload iria com ~500 MB de vídeo. Me chama no chat."
  exit 1
fi

VERSAO=$(node -p "require('./package.json').version")
echo ""
echo "=================================================="
echo "  Versão que vai no build:  $VERSAO"
echo "  Plataforma:               $PLATAFORMA"
echo "  Custa:                    1 build da cota do EAS"
echo "=================================================="
echo "ANTES de confirmar, responda pra você mesmo:"
echo "  • A versão $VERSAO ainda NÃO está publicada nas lojas? (se já está, PARE:"
echo "    a Apple não aceita build novo em versão publicada — suba a versão antes)"
read -r -p "Tudo certo? Gerar o build? (s/N) " RESP
if [[ "$RESP" != "s" && "$RESP" != "S" ]]; then
  echo "Cancelado. Nada foi gasto."
  exit 0
fi

if [[ "$PLATAFORMA" == "ios" ]]; then
  npx eas-cli build -p ios --profile production --auto-submit
else
  npx eas-cli build -p android --profile production
fi
