#!/usr/bin/env bash
# Uso: bash scripts/publicar.sh "Mensagem do update"
#
# O jeito aprovado de publicar EAS Update (não gasta cota de build, mas update
# publicado do código errado chega no celular de todo mundo do mesmo jeito).
# Mesmas travas do buildar.sh: branch certa, nada local, pull que não falha
# calado, e mostra a versão-alvo antes de publicar.
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH_ESPERADA="claude/laughing-keller-my8t7c"

MENSAGEM="${1:-}"
if [[ -z "$MENSAGEM" ]]; then
  echo 'Uso: bash scripts/publicar.sh "Mensagem do update"'
  exit 1
fi

BRANCH_ATUAL=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH_ATUAL" != "$BRANCH_ESPERADA" ]]; then
  echo "✋ PAREI: você está na branch '$BRANCH_ATUAL' (o update sai da '$BRANCH_ESPERADA')."
  echo "Pra voltar:  git checkout $BRANCH_ESPERADA"
  exit 1
fi

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "✋ PAREI: tem mudança local nestes arquivos:"
  git status --porcelain --untracked-files=no
  echo "Pra descartar:  git checkout -- .   e rode de novo."
  exit 1
fi

git pull --ff-only

VERSAO=$(node -p "require('./package.json').version")
echo ""
echo "=================================================="
echo "  Update vai pra quem tem o app:  $VERSAO"
echo "  Canal:                          production"
echo "  Mensagem:                       $MENSAGEM"
echo "=================================================="
read -r -p "Publicar? (s/N) " RESP
if [[ "$RESP" != "s" && "$RESP" != "S" ]]; then
  echo "Cancelado."
  exit 0
fi

npx eas-cli update --branch production --message "$MENSAGEM"
