// Gera o PDF de um catálogo: node scripts/lojinha-pdf.mjs [docs/lojinha.html] → docs/Irisa-lojinha.pdf (ou -interna).
import { chromium } from "playwright-core";
import { resolve } from "node:path";
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--ignore-certificate-errors"] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
const SRC = process.argv[2] ?? "docs/lojinha.html"; const OUT = SRC.includes("interna") ? "docs/Irisa-lojinha-interna.pdf" : "docs/Irisa-lojinha.pdf";
await pg.goto("file://" + resolve(SRC), { waitUntil: "networkidle" });
await pg.evaluate(() => document.fonts.ready);
await pg.emulateMedia({ media: "print" });
await pg.pdf({ path: OUT, width: "1080px", height: "1350px", printBackground: true, preferCSSPageSize: true });
await b.close();
console.log(OUT);
