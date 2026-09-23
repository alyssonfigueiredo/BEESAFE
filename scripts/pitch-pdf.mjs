// Gera docs/Irisa-apresentacao.pdf a partir de docs/pitch.html, um slide por página.
// Roda: node scripts/pitch-pdf.mjs   (usa o Chromium do Playwright já instalado)
// A página é aberta com ?static para desligar as animações: no PDF tudo precisa estar visível.
import { chromium } from "playwright-core";
import { resolve } from "node:path";

const W = 1280, H = 800;
const CSS = `
  html{scroll-snap-type:none}
  .slide{min-height:${H}px;height:${H}px;break-after:page;page-break-after:always;border-bottom:none;overflow:hidden}
  .slide:last-of-type{break-after:auto;page-break-after:auto}
  .phones{zoom:.66}
  .kbd,.progress,.counter{display:none}
  .siren{animation:none!important;box-shadow:none!important}
`;
const html = "file://" + resolve("docs/pitch.html") + "?static";
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium" });
const pg = await b.newPage({ viewport: { width: W, height: H } });
await pg.goto(html, { waitUntil: "networkidle" });
await pg.waitForTimeout(1500);
await pg.addStyleTag({ content: CSS });
await pg.emulateMedia({ media: "screen" });
await pg.pdf({ path: resolve("docs/Irisa-apresentacao.pdf"), width: `${W}px`, height: `${H}px`, printBackground: true });
await b.close();
console.log("docs/Irisa-apresentacao.pdf");
