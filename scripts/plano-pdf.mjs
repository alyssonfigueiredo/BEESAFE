// Gera docs/Irisa-plano-lancamento.pdf a partir de docs/plano-lancamento.html.
// Roda: node scripts/plano-pdf.mjs   (usa o Chromium do Playwright já instalado)
// A página rola numa coluna só; aqui ela vira A4 em pé, quebrando entre as seções.
import { chromium } from "playwright-core";
import { resolve } from "node:path";

const CSS = `
  html{scroll-behavior:auto}
  .bg{position:absolute}
  nav.toc{display:none}
  .wrap{max-width:none;padding:24px 28px 32px;gap:34px}
  section{break-inside:avoid-page}
  .card,.piece,.day,.pillar,table{break-inside:avoid-page}
  *{animation:none!important;transition:none!important}
  /* O texto em arco-íris usa background-clip:text; a impressão do Chromium
     ignora o recorte e pinta o retângulo inteiro por cima da letra. No PDF
     o arco-íris vira uma cor só. */
  .rb,.rainbow{background:none!important;-webkit-background-clip:border-box!important;
    background-clip:border-box!important;color:var(--orangeInk)!important;
    -webkit-text-fill-color:var(--orangeInk)!important}
`;
const html = "file://" + resolve("docs/plano-lancamento.html");
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium" });
const pg = await b.newPage({ viewport: { width: 1040, height: 1400 } });
await pg.goto(html, { waitUntil: "networkidle" });
await pg.waitForTimeout(1500);
await pg.addStyleTag({ content: CSS });
await pg.emulateMedia({ media: "screen" });
await pg.pdf({
  path: resolve("docs/Irisa-plano-lancamento.pdf"),
  format: "A4",
  printBackground: true,
  margin: { top: "10mm", bottom: "12mm", left: "8mm", right: "8mm" },
});
await b.close();
console.log("docs/Irisa-plano-lancamento.pdf");
