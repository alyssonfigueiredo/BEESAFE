// Exporta cada lâmina de docs/carrossel.html (1080x1350) como PNG em docs/carrossel/01.png … 08.png.
// Roda: node scripts/carrossel-png.mjs
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

mkdirSync("docs/carrossel", { recursive: true });
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--ignore-certificate-errors"] });
const pg = await b.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 1 });
await pg.goto("file://" + resolve("docs/carrossel.html"), { waitUntil: "networkidle" });
await pg.evaluate(() => document.fonts.ready);
const n = await pg.locator(".sl").count();
for (let i = 0; i < n; i++) {
  const path = `docs/carrossel/${String(i + 1).padStart(2, "0")}.png`;
  await pg.locator(".sl").nth(i).screenshot({ path, type: "png" });
  console.log(path);
}
await b.close();
