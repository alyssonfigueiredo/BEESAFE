// Gera docs/Irisa-plano-lancamento.pdf a partir de docs/plano-lancamento.html.
// Roda: node scripts/plano-pdf.mjs   (usa o Chromium do Playwright já instalado)
// A página rola numa coluna só; aqui ela vira A4 em pé.
import { chromium } from "playwright-core";
import { resolve } from "node:path";

const CSS = `
  html{scroll-behavior:auto}
  /* overflow-x:hidden no body vira caixa de rolagem e o cabeçalho da tabela
     deixa de se repetir nas páginas seguintes. */
  body{overflow:visible!important}
  *{animation:none!important;transition:none!important}
  nav.toc{display:none}

  /* O Chromium não sabe quebrar um container grid entre páginas: o que vem
     depois de uma tabela longa era desenhado por cima dela. No PDF o miolo
     vira bloco simples, com margem no lugar do gap. */
  .wrap,section,header{display:block!important}
  section{margin-bottom:30px}
  /* Duas colunas de cartão alto quebram mal: a coluna curta deixa uma caixa
     vazia na página seguinte. Em A4 elas viram uma embaixo da outra. */
  .no{display:block!important}
  .no>*+*{margin-top:12px}
  section>*+*{margin-top:18px}
  header>*+*{margin-top:18px}
  .wrap{max-width:none;padding:0 28px 24px}

  /* As manchas de cor ficam só na primeira página: esticadas pelo documento
     inteiro, viram faixas no meio das outras. */
  .bg{position:absolute;inset:auto 0 auto 0;top:0;height:273mm}

  /* Nada de prender a seção inteira numa página: uma tabela longa empurrava
     tudo e deixava a página anterior quase vazia. Quem não pode quebrar é o
     cartão e a linha. */
  .eyebrow,h1,h2{break-after:avoid-page}
  h1,h2{break-before:avoid-page}
  .piece,.day,.pillar,tr,li,h1,h2,h3,.quote,.legend{break-inside:avoid-page}
  thead{display:table-header-group}
  /* A caixa de vidro em volta da tabela não sabe quebrar entre páginas: o
     texto seguinte saía por cima das linhas. No PDF a tabela sai crua. */
  .tbl{overflow:visible;background:none;box-shadow:none;border-radius:0;
    -webkit-backdrop-filter:none;backdrop-filter:none}

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
  margin: { top: "12mm", bottom: "12mm", left: "8mm", right: "8mm" },
});
await b.close();
console.log("docs/Irisa-plano-lancamento.pdf");
