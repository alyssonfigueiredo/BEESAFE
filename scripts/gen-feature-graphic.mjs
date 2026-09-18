// Gera o gráfico de recursos 1024x500 da Play Store em assets/feature-graphic.png.
// Uso: node scripts/gen-feature-graphic.mjs (precisa de Chromium, como o gen-icons).
// Em ambientes sem o canal "chromium" do Playwright, aponte o executável em CHROMIUM_PATH.
import { readFileSync } from "node:fs";

import { chromium } from "playwright-core";

import { INK, mark, PAPER } from "./brand-mark.mjs";

const LARGURA = 1024;
const ALTURA = 500;

// Urbanist é a fonte do wordmark. Vem do pacote já instalado; sem ela, cai na sans do sistema.
function fonte(caminho, familia) {
  try {
    const b64 = readFileSync(new URL(caminho, import.meta.url)).toString("base64");
    return `@font-face{font-family:'${familia}';src:url(data:font/ttf;base64,${b64}) format('truetype')}`;
  } catch {
    return "";
  }
}

const fontes =
  fonte("../node_modules/@expo-google-fonts/urbanist/700Bold/Urbanist_700Bold.ttf", "Urbanist") +
  fonte(
    "../node_modules/@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf",
    "SpaceGrotesk",
  );

const html = `<html><head><meta charset="utf-8"><style>
  ${fontes}
  html,body{margin:0}
  body{width:${LARGURA}px;height:${ALTURA}px;background:${PAPER};
       display:flex;align-items:center;gap:56px;padding:0 88px;box-sizing:border-box}
  .marca{width:260px;height:260px;flex:none}
  h1{font-family:'Urbanist',system-ui,sans-serif;font-size:104px;line-height:1;margin:0;
     color:${INK};letter-spacing:-2px}
  p{font-family:'SpaceGrotesk',system-ui,sans-serif;font-size:34px;line-height:1.3;
    margin:18px 0 0;color:${INK};opacity:.78}
</style></head><body>
  <div class="marca">${mark({ size: 260, bg: "transparent", pad: 0.02 })}</div>
  <div><h1>Irisa</h1><p>A cidade vista por você</p></div>
</body></html>`;

async function abrirNavegador() {
  const tentativas = [];
  if (process.env.CHROMIUM_PATH) tentativas.push({ executablePath: process.env.CHROMIUM_PATH });
  tentativas.push({ channel: "chromium" }, { channel: "chrome" }, { channel: "msedge" });
  tentativas.push({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  let ultimo;
  for (const opcao of tentativas) {
    try {
      return await chromium.launch(opcao);
    } catch (e) {
      ultimo = e;
    }
  }
  console.error(
    "✗ Nenhum navegador encontrado. Instale o Chrome, ou rode: npx playwright install chromium",
  );
  throw ultimo;
}

const browser = await abrirNavegador();
const page = await browser.newPage();
await page.setViewportSize({ width: LARGURA, height: ALTURA });
await page.setContent(html);
await page.screenshot({
  path: "assets/feature-graphic.png",
  clip: { x: 0, y: 0, width: LARGURA, height: ALTURA },
});
await browser.close();
console.log("ok assets/feature-graphic.png");
