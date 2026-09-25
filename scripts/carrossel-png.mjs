// Exporta cada lâmina de um carrossel (1080x1350) como PNG numerado.
// Roda: node scripts/carrossel-png.mjs                       → docs/carrossel.html → docs/carrossel/01.png …
//       node scripts/carrossel-png.mjs docs/carrossel-2.html → docs/carrossel-2/01.png …
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SRC = process.argv[2] ?? "docs/carrossel.html";
const DIR = SRC.replace(/\.html$/, "");
mkdirSync(DIR, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--ignore-certificate-errors"] });
const pg = await b.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: Number(process.env.SCALE ?? 1) });
await pg.goto("file://" + resolve(SRC), { waitUntil: "networkidle" });
await pg.evaluate(() => document.fonts.ready);
const n = await pg.locator(".sl").count();
for (let i = 0; i < n; i++) {
  const path = `${DIR}/${String(i + 1).padStart(2, "0")}.png`;
  await pg.locator(".sl").nth(i).screenshot({ path, type: "png" });
  console.log(path);
}
await b.close();
