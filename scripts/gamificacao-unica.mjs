// Junta a apresentação da gamificação num HTML só, que abre sozinho em qualquer lugar (celular, e-mail, Drive):
// pingentes.js entra no próprio arquivo e as telas viram imagens embutidas (WebP).
// node scripts/gamificacao-unica.mjs  →  docs/Irisa-gamificacao.html
import { chromium } from "playwright-core";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(raiz, "docs");
let html = readFileSync(path.join(docs, "gamificacao.html"), "utf8");
const js = readFileSync(path.join(docs, "pingentes.js"), "utf8");
html = html.replace('<script src="pingentes.js"></script>', () => `<script>\n${js}</script>`);

// PNG das telas → WebP menor, desenhado num canvas do Chromium (sem dependência nova)
const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage();
const imgs = [...new Set([...html.matchAll(/src="(gamificacao\/[^"]+\.png)"/g)].map((m) => m[1]))];
for (const src of imgs) {
  const b64 = readFileSync(path.join(docs, src)).toString("base64");
  const webp = await page.evaluate(async (b64) => {
    const im = new Image();
    im.src = "data:image/png;base64," + b64;
    await im.decode();
    const w = Math.min(im.width, 780), h = Math.round((im.height * w) / im.width);
    const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
    c.getContext("2d").drawImage(im, 0, 0, w, h);
    return c.toDataURL("image/webp", 0.86);
  }, b64);
  html = html.replaceAll(`src="${src}"`, `src="${webp}"`);
}
await browser.close();
const saida = path.join(docs, "Irisa-gamificacao.html");
writeFileSync(saida, html);
console.log(`docs/Irisa-gamificacao.html (${(html.length / 1024).toFixed(0)} KB, ${imgs.length} telas embutidas)`);
