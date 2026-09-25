// Gera docs/Irisa-lojinha.pdf a partir de docs/lojinha.html (uma lâmina por página, 1080x1350).
import { chromium } from "playwright-core";
import { resolve } from "node:path";
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--ignore-certificate-errors"] });
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await pg.goto("file://" + resolve("docs/lojinha.html"), { waitUntil: "networkidle" });
await pg.evaluate(() => document.fonts.ready);
await pg.emulateMedia({ media: "print" });
await pg.pdf({ path: "docs/Irisa-lojinha.pdf", width: "1080px", height: "1350px", printBackground: true, preferCSSPageSize: true });
await b.close();
console.log("docs/Irisa-lojinha.pdf");
