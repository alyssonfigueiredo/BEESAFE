// Exporta as telas de exemplo da gamificação (docs/gamificacao-telas.html) em PNG para apresentação.
// node scripts/gamificacao-telas.mjs  →  docs/gamificacao/tela-*.png (celular 1170×2532, story 1080×1920)
// node scripts/gamificacao-telas.mjs docs/gamificacao-final-telas.html  →  docs/gamificacao/final-*.png
import { chromium } from "playwright-core";
import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fontes = path.join(raiz, "node_modules/@expo-google-fonts/");
const faces = [["Oswald", 400, "oswald/400Regular/Oswald_400Regular.ttf"], ["Oswald", 700, "oswald/700Bold/Oswald_700Bold.ttf"], ["Urbanist", 500, "urbanist/500Medium/Urbanist_500Medium.ttf"], ["Space Grotesk", 400, "space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf"], ["Space Grotesk", 500, "space-grotesk/500Medium/SpaceGrotesk_500Medium.ttf"], ["Space Grotesk", 600, "space-grotesk/600SemiBold/SpaceGrotesk_600SemiBold.ttf"], ["Space Grotesk", 700, "space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf"]];
// fontes locais: não depende do Google Fonts estar acessível
const css = faces.map(([f, w, p]) => `@font-face{font-family:"${f}";font-weight:${w};src:url(data:font/ttf;base64,${readFileSync(fontes + p).toString("base64")})}`).join("\n");

const saida = path.join(raiz, "docs/gamificacao");
mkdirSync(saida, { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 3 });
page.on("pageerror", (e) => console.log("erro na página:", e.message));
await page.route(/fonts\.googleapis/, (r) => r.fulfill({ contentType: "text/css", body: css }));
await page.route(/gstatic/, (r) => r.abort());
await page.goto("file://" + path.join(raiz, process.argv[2] || "docs/gamificacao-telas.html"));
await page.evaluate(() => document.fonts.ready);
for (const id of await page.$$eval(".ph,.story", (els) => els.map((e) => e.id))) {
  await page.locator("#" + id).screenshot({ path: path.join(saida, id + ".png") });
  console.log("docs/gamificacao/" + id + ".png");
}
await browser.close();
