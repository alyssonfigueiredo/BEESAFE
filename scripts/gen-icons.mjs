// Gera os ícones em assets/ a partir da marca (anel + pupila). Uso: node scripts/gen-icons.mjs (precisa de Chromium).
import { chromium } from "playwright-core";
import fs from "node:fs";

const NIGHT = "#0B132B";
// marca: íris. anel com as cores do design system + pupila noturna. `mono` = versão monocromática.
function mark({ size, bg, pad = 0, mono = false }) {
  const r = (size / 2) * (1 - pad);
  const cx = size / 2,
    cy = size / 2;
  const cols = mono
    ? ["#fff", "#fff", "#fff", "#fff", "#fff"]
    : ["#FF5A5F", "#FF9F45", "#FFD166", "#5BC0BE", "#A78BFA"];
  // 5 arcos iguais no anel
  const arcs = cols
    .map((c, i) => {
      const a0 = (i / 5) * 2 * Math.PI - Math.PI / 2,
        a1 = ((i + 1) / 5) * 2 * Math.PI - Math.PI / 2;
      const ro = r * 0.92,
        ri = r * 0.58;
      const p = (rr, a) => `${cx + rr * Math.cos(a)} ${cy + rr * Math.sin(a)}`;
      return `<path d="M ${p(ro, a0)} A ${ro} ${ro} 0 0 1 ${p(ro, a1)} L ${p(ri, a1)} A ${ri} ${ri} 0 0 0 ${p(ri, a0)} Z" fill="${c}" stroke="${bg === "transparent" ? NIGHT : bg}" stroke-width="${size * 0.012}"/>`;
    })
    .join("");
  const pupil =
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.36}" fill="${mono ? "#fff" : NIGHT}"/>` +
    (mono
      ? ""
      : `<circle cx="${cx - r * 0.12}" cy="${cy - r * 0.14}" r="${r * 0.08}" fill="#FFD166"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg === "transparent" ? "" : `<rect width="${size}" height="${size}" fill="${bg}"/>`}${arcs}${pupil}</svg>`;
}

const jobs = [
  ["icon.png", { size: 1024, bg: NIGHT, pad: 0.12 }],
  ["splash-icon.png", { size: 512, bg: "transparent", pad: 0.05 }],
  ["android-icon-foreground.png", { size: 1024, bg: "transparent", pad: 0.36 }],
  ["android-icon-background.png", { size: 1024, bg: NIGHT, pad: 1 }],
  ["android-icon-monochrome.png", { size: 1024, bg: "transparent", pad: 0.36, mono: true }],
  ["favicon.png", { size: 96, bg: NIGHT, pad: 0.1 }],
];
const browser = await chromium.launch({ channel: "chromium" });
const page = await browser.newPage();
for (const [name, opts] of jobs) {
  const svg = mark(opts);
  await page.setViewportSize({ width: opts.size, height: opts.size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({
    path: `assets/${name}`,
    omitBackground: true,
    clip: { x: 0, y: 0, width: opts.size, height: opts.size },
  });
  console.log("ok", name);
}
await browser.close();
