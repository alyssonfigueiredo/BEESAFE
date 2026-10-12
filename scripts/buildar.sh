#!/usr/bin/env bash
# Uso: bash scripts/buildar.sh ios   |   bash scripts/buildar.sh android
#
# Builds do EAS gastam cota e NÃO podem sair do código errado. Em 11/10/2026 um
# `git pull` falhou calado (mudança local em package.json) e 4 builds saíram da
# versão antiga. Este script é o único jeito aprovado de buildar: ele atualiza o
# código, PARA na primeira coisa estranha e mostra a versão antes de gastar.
set -euo pipefail
cd "$(dirname "$0")/.."

PLATAFORMA="${1:-}"
if [[ "$PLATAFORMA" != "ios" && "$PLATAFORMA" != "android" ]]; then
  echo "Uso: bash scripts/buildar.sh ios   ou   bash scripts/buildar.sh android"
  exit 1
fi

echo "— Conferindo o repositório…"

# Mudança local em arquivo versionado é o que fez o pull falhar calado.
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo ""
  echo "✋ PAREI: tem mudança local nestes arquivos:"
  git status --porcelain --untracked-files=no
  echo ""
  echo "Ninguém edita arquivo direto nesta pasta — isso veio de algum acidente."
  echo "Pra descartar e voltar ao que está no GitHub, rode:"
  echo "    git checkout -- ."
  echo "e depois rode este script de novo."
  exit 1
fi

# Pull que NÃO pode falhar calado: qualquer erro para o script aqui.
git pull --ff-only

VERSAO=$(node -p "require('./package.json').version")
echo ""
echo "================================================"
echo "  Versão que vai no build: $VERSAO"
echo "  Plataforma: $PLATAFORMA   (isso gasta 1 build da cota)"
echo "================================================"
read -r -p "Confirma? (s/N) " RESP
if [[ "$RESP" != "s" && "$RESP" != "S" ]]; then
  echo "Cancelado. Nada foi gasto."
  exit 0
fi

if [[ "$PLATAFORMA" == "ios" ]]; then
  npx eas-cli build -p ios --profile production --auto-submit
else
  npx eas-cli build -p android --profile production
fi
