#!/usr/bin/env bash
# Tira os prints da loja no Simulador do iPhone, um por tela, em screenshots/.
# Uso (no Mac, dentro da pasta BEESAFE):  bash scripts/screenshots.sh
# Precisa do Xcode instalado. O app pede login: o script pausa para você entrar uma vez.
set -euo pipefail

DEST="${DEST:-screenshots}"
DISPOSITIVO="${DISPOSITIVO:-iPhone 16 Pro}"
mkdir -p "$DEST"

echo "▶ Abrindo o Simulador ($DISPOSITIVO)"
open -a Simulator
xcrun simctl boot "$DISPOSITIVO" 2>/dev/null || true
xcrun simctl bootstatus "$DISPOSITIVO" -b

echo "▶ Compilando e instalando o app no Simulador (demora na primeira vez)"
npx expo run:ios --device "$DISPOSITIVO" --configuration Release

# Um lugar real de Curitiba, para o print da ficha. Usa a chave pública do .env, nunca a secreta.
ID_LUGAR=""
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a && . ./.env && set +a
  ID_LUGAR=$(curl -sS \
    "${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/public_places?select=id&limit=1" \
    -H "apikey: ${EXPO_PUBLIC_SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${EXPO_PUBLIC_SUPABASE_ANON_KEY}" |
    sed -n 's/.*"id":"\([^"]*\)".*/\1/p') || true
fi

echo
echo "▶ Entre na sua conta no Simulador (ou crie a conta de teste) e volte aqui."
read -r -p "  Pronto? Aperte Enter para começar os prints. " _

tela() {
  local nome="$1" rota="$2"
  xcrun simctl openurl booted "irisa://$rota"
  sleep 4 # tempo para o mapa e as consultas carregarem
  xcrun simctl io booted screenshot "$DEST/$nome.png"
  echo "  ✓ $DEST/$nome.png"
}

echo "▶ Capturando"
tela 1-inicio ""
tela 2-mapa "mapa"
[ -n "$ID_LUGAR" ] && tela 3-lugar "lugar/$ID_LUGAR" || echo "  — pulei a ficha do lugar (não achei um id; tire esse print na mão)"
tela 4-registrar "registrar"
tela 5-apoio "apoio"

echo
echo "Prontos em $DEST/ — é isso que você sobe no Play Console."
open "$DEST"
