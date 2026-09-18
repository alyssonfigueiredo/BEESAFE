#!/usr/bin/env bash
# Tira os prints da loja no Simulador do iPhone, um por tela, em screenshots/.
# Uso (no Mac, dentro da pasta BEESAFE):  bash scripts/screenshots.sh
# Precisa do Xcode instalado. O app pede login: o script pausa para você entrar uma vez.
set -euo pipefail

DEST="${DEST:-screenshots}"
DISPOSITIVO="${DISPOSITIVO:-}" # vazio = escolhe o primeiro iPhone disponível
mkdir -p "$DEST"

if ! xcrun simctl help >/dev/null 2>&1; then
  echo "✗ O Xcode não está configurado (xcrun simctl não responde)."
  echo "  Instale o Xcode pela App Store, abra uma vez, aceite os termos e rode:"
  echo "    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  exit 1
fi

IPHONES=$(xcrun simctl list devices available | grep -E "^    iPhone" | sed 's/ (.*//;s/^    //')
if [ -z "$IPHONES" ]; then
  echo "✗ Nenhum simulador de iPhone instalado."
  echo "  Baixe um runtime: Xcode → Settings → Components → iOS Simulator"
  exit 1
fi
if [ -z "$DISPOSITIVO" ]; then
  DISPOSITIVO=$(echo "$IPHONES" | head -1)
elif ! echo "$IPHONES" | grep -qx "$DISPOSITIVO"; then
  echo "✗ Não existe um simulador chamado \"$DISPOSITIVO\". Os disponíveis são:"
  echo "$IPHONES" | sed 's/^/    /'
  exit 1
fi

# A janela do Simulador é só conforto: o simctl funciona sem ela.
DEV="$(xcode-select -p 2>/dev/null || true)"
[ -d "$DEV/Applications/Simulator.app" ] && open -a "$DEV/Applications/Simulator.app" || true

echo "▶ Ligando o simulador ($DISPOSITIVO)"
xcrun simctl boot "$DISPOSITIVO" 2>/dev/null || true
xcrun simctl bootstatus "$DISPOSITIVO" -b

if [ "${PULAR_BUILD:-}" = "1" ]; then
  echo "▶ Usando o app já instalado no Simulador (PULAR_BUILD=1)"
else
  echo "▶ Compilando e instalando o app no Simulador (demora na primeira vez)"
  # --no-bundler: em Release o bundle já vai embutido, e sem isso o Metro segura o terminal
  # e o script nunca chega aqui.
  npx expo run:ios --device "$DISPOSITIVO" --configuration Release --no-bundler
fi

echo
echo "▶ Entre na sua conta no Simulador. Se ainda não tem a conta de teste, crie agora."
read -r -p "  Pronto? Aperte Enter. " _

# Navegar por deep link não dá: o iOS mostra o alerta "Abrir com Irisa?" em cima de toda tela.
# Então você navega e o script só captura, nomeia e salva.
tela() {
  local arquivo="$1" instrucao="$2"
  read -r -p "  Abra $instrucao e aperte Enter. " _
  xcrun simctl io booted screenshot "$DEST/$arquivo.png"
  echo "    ✓ $DEST/$arquivo.png"
}

echo
echo "▶ Capturando (uma tela por vez)"
tela 1-inicio "a tela Início"
tela 2-mapa "o Mapa, com Curitiba enquadrada"
tela 3-lugar "a ficha de um lugar (toque em um marcador ou em um item da lista)"
tela 4-registrar "a tela Registrar"
tela 5-apoio "a tela Apoio"

echo
echo "Prontos em $DEST/ — é isso que você sobe no Play Console."
open "$DEST"
