// Pack completo da marca em docs/marca-pack/: PNG transparente (símbolo completo, redução, lockups), perfil, ícone, favicon, PDF da folha.
// Roda: node scripts/marca-pack.mjs
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { radar, radarMin } from "./marca.mjs";
const OUT = "docs/marca-pack"; mkdirSync(OUT, { recursive: true });
const R = radar("pk"), M = radarMin();
const css = `@import url('https://fonts.googleapis.com/css2?family=Urbanist:wght@500&family=Space+Grotesk:wght@400&display=swap');
:root{--yellow:#FFD066}body{margin:0;background:transparent;font-family:"Urbanist",sans-serif}
.w b{font-weight:500;color:var(--yellow)}.ink{color:#141829}.white{color:#fff}
.vert{display:inline-flex;flex-direction:column;align-items:center;padding:40px}.vert svg{width:396px;height:396px}.vert .w{font:500 78px/1 Urbanist;letter-spacing:.34em;padding-left:.34em;text-transform:uppercase;margin-top:66px}.vert .t{font:400 42px "Space Grotesk";margin-top:30px;color:#3D4560}.white .t{color:#C9CCDA}
.hor{display:inline-flex;align-items:center;gap:48px;padding:40px}.hor svg{width:144px;height:144px}.hor .w{font:500 84px/1 Urbanist;letter-spacing:.24em;text-transform:uppercase}
.red{display:inline-flex;align-items:center;gap:36px;padding:40px}.red svg{width:120px;height:120px}.red .w{font:500 60px/1 Urbanist;letter-spacing:.2em;text-transform:uppercase}
.sym{display:inline-block;padding:0}.sym svg{display:block}
.perfil{width:1080px;height:1080px;display:flex;align-items:center;justify-content:center;background:#F5F4F1;background-image:radial-gradient(60% 40% at 0% 0%,color-mix(in srgb,#49DCC0 22%,transparent),transparent 60%),radial-gradient(50% 35% at 100% 100%,color-mix(in srgb,#A889FF 22%,transparent),transparent 60%)}
.perfil.night{background:#141829;background-image:radial-gradient(60% 40% at 0% 0%,color-mix(in srgb,#49DCC0 18%,transparent),transparent 60%),radial-gradient(50% 35% at 100% 100%,color-mix(in srgb,#A889FF 20%,transparent),transparent 60%)}
.perfil svg{width:640px;height:640px}
.icone{width:1024px;height:1024px;display:flex;align-items:center;justify-content:center;background:#F5F4F1}.icone svg{width:720px;height:720px}`;
const items = [
  ["simbolo-2048", `<div class="sym"><svg viewBox="0 0 100 100" width="2048" height="2048">${R}</svg></div>`],
  ["simbolo-512", `<div class="sym"><svg viewBox="0 0 100 100" width="512" height="512">${R}</svg></div>`],
  ["simbolo-reducao-1024", `<div class="sym"><svg viewBox="0 0 100 100" width="1024" height="1024">${M}</svg></div>`],
  ["simbolo-reducao-256", `<div class="sym"><svg viewBox="0 0 100 100" width="256" height="256">${M}</svg></div>`],
  ["vertical-ink", `<div class="vert ink"><svg viewBox="0 0 100 100">${R}</svg><div class="w">Iris<b>a</b></div><div class="t">quanta cor tem aqui?</div></div>`],
  ["vertical-white", `<div class="vert white"><svg viewBox="0 0 100 100">${R}</svg><div class="w">Iris<b>a</b></div><div class="t">quanta cor tem aqui?</div></div>`],
  ["horizontal-ink", `<div class="hor ink"><svg viewBox="0 0 100 100">${R}</svg><div class="w">Iris<b>a</b></div></div>`],
  ["horizontal-white", `<div class="hor white"><svg viewBox="0 0 100 100">${R}</svg><div class="w">Iris<b>a</b></div></div>`],
  ["reducao-ink", `<div class="red ink"><svg viewBox="0 0 100 100">${M}</svg><div class="w">Iris<b>a</b></div></div>`],
  ["reducao-white", `<div class="red white"><svg viewBox="0 0 100 100">${M}</svg><div class="w">Iris<b>a</b></div></div>`],
  ["perfil-instagram-paper", `<div class="perfil"><svg viewBox="0 0 100 100">${R}</svg></div>`, false],
  ["perfil-instagram-night", `<div class="perfil night"><svg viewBox="0 0 100 100">${R}</svg></div>`, false],
  ["icone-1024", `<div class="icone"><svg viewBox="0 0 100 100">${R}</svg></div>`, false],
  ["favicon-64", `<div class="sym"><svg viewBox="0 0 100 100" width="64" height="64">${M}</svg></div>`],
  ["favicon-32", `<div class="sym"><svg viewBox="0 0 100 100" width="32" height="32">${M}</svg></div>`],
];
const b = await chromium.launch({ executablePath: process.env.PW_CHROMIUM ?? "/opt/pw-browsers/chromium", args: ["--ignore-certificate-errors"] });
const pg = await b.newPage({ viewport: { width: 2200, height: 2200 }, deviceScaleFactor: 1 });
for (const [name, html, transparent = true] of items) {
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`, { waitUntil: "networkidle" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.locator("body > *").first().screenshot({ path: `${OUT}/irisa-${name}.png`, omitBackground: transparent });
  console.log(`${OUT}/irisa-${name}.png`);
}
// folha da marca em PDF
await pg.setViewportSize({ width: 1080, height: 1350 });
await pg.goto("file://" + resolve("docs/marca.html"), { waitUntil: "networkidle" });
await pg.evaluate(() => document.fonts.ready);
await pg.addStyleTag({ content: "body{padding:0;gap:0;background:#fff}.sl{page-break-after:always}" });
await pg.pdf({ path: `${OUT}/Irisa-marca-folha.pdf`, width: "1080px", height: "1350px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await b.close();
writeFileSync(`${OUT}/LEIA-ME.txt`, `Irisa · pack da marca (27/09/2026)

Símbolo: o radar da abertura do app (anel de 48 gomos nas seis cores da marca com saturação ×1.35, varredura turquesa,
três pontos, pupila #0F1220 com brilho). Nome: IRISA em Urbanist 500, caixa alta, A em #FFD066.

Versões
1. Vertical   irisa-vertical-*.svg/png      símbolo sobre o nome (.34em) + tagline opcional. Mínimo: símbolo 96 px.
2. Horizontal irisa-horizontal-*.svg/png    símbolo à esquerda, nome .24em. Mínimo: símbolo 32 px.
3. Redução    irisa-reducao-*.svg/png       só o anel colorido (sem pupila) + nome .2em. Abaixo de 50 px. Mínimo 20 px.

Arquivos
- svg/                 vetores (paper e night; texto em Urbanist, instale a fonte ou use os PNG)
- png/transparente/    símbolo 2048 e 512, redução 1024 e 256, lockups com nome escuro (-ink) e claro (-white)
- png/fundo/           lockups sobre papel e night (1080/1180 px), folha da marca
- perfil/              foto de perfil do Instagram 1080×1080 (paper e night), ícone 1024, favicon 64 e 32
- video/               abertura animada 4,2 s: story 1080×1920 (paper, night, verde chroma) e quadrado 1080×1080
- Irisa-marca-folha.pdf

Cores  coral #FF6964 · laranja #FFA353 · amarelo #FFD066 · turquesa #49DCC0 · azul #59A7FF · lilás #A889FF
       papel #F5F4F1 · night #141829 · pupila #0F1220 · texto #141829 · apoio #3D4560
Regras área de respiro = raio da pupila (13% do símbolo). Nunca uma cor só, nunca P&B, nunca esticado, girado ou com sombra.
       Nome sempre com o A amarelo (âmbar #FFAD0F abaixo de 20 px). Redução sem pupila; completo só a partir de 50 px.
Fontes Urbanist 500 (nome), Space Grotesk 400 (tagline), Oswald 500/700 (títulos das peças). Google Fonts.
`);
console.log("pack pronto");
