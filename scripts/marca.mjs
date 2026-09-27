// Marca Irisa: gera os SVGs oficiais (vertical, horizontal, redução) em docs/marca/ e a folha docs/marca.html.
// Mesmo radar da abertura (docs/abertura.html, src/components/Splash.tsx): 48 gomos, saturação ×1.35, pupila #0F1220.
// Roda: node scripts/marca.mjs   → depois node scripts/carrossel-png.mjs docs/marca.html para a folha em PNG.
import { writeFileSync, mkdirSync } from "node:fs";

const RING = ["#F4736F", "#F5A45D", "#F0CA75", "#5CC9B4", "#6AA8EE", "#AE96F2"];
const SAT = 1.35;
function sat(h) { let r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, s = 0;
  if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh /= 6; }
  s = Math.min(1, s * SAT); const qq = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - qq,
  f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (qq - p) * 6 * t; if (t < 1 / 2) return qq; if (t < 2 / 3) return p + (qq - p) * (2 / 3 - t) * 6; return p; };
  const hx = (x) => Math.round(x * 255).toString(16).padStart(2, "0"); return s === 0 ? h : "#" + hx(f(hh + 1 / 3)) + hx(f(hh)) + hx(f(hh - 1 / 3)); }
const lerp = (a, b, t) => { let o = "#"; for (let i = 1; i < 7; i += 2) { const x = parseInt(a.slice(i, i + 2), 16), y = parseInt(b.slice(i, i + 2), 16); o += Math.round(x + (y - x) * t).toString(16).padStart(2, "0"); } return o; };
const rc = (t) => { const p = t * RING.length, i = Math.floor(p) % RING.length; return sat(lerp(RING[i], RING[(i + 1) % RING.length], p - Math.floor(p))); };
const pt = (r, a) => [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
const slice = (ro, ri, a0, a1) => { const [o0x, o0y] = pt(ro, a0), [o1x, o1y] = pt(ro, a1), [i1x, i1y] = pt(ri, a1), [i0x, i0y] = pt(ri, a0);
  return `M${o0x.toFixed(2)} ${o0y.toFixed(2)}A${ro} ${ro} 0 0 1 ${o1x.toFixed(2)} ${o1y.toFixed(2)}L${i1x.toFixed(2)} ${i1y.toFixed(2)}A${ri} ${ri} 0 0 0 ${i0x.toFixed(2)} ${i0y.toFixed(2)}Z`; };
export const PUPIL = "#0F1220", SWEEP = sat("#5CC9B4"), CORAL = sat("#F4736F"), YELLOW = sat("#F0CA75"), INK = "#141829", PAPER = "#F5F4F1", NIGHT = "#141829";
export const PAL = { coral: sat("#F4736F"), orange: sat("#F5A45D"), yellow: YELLOW, turq: SWEEP, blue: sat("#6AA8EE"), lilac: sat("#AE96F2") };

// Símbolo completo (radar): anel de 48 gomos, varredura, círculo-guia, três pontos, pupila com brilho. viewBox 0 0 100 100.
export function radar(id = "sw") {
  let s = ""; for (let i = 0; i < 48; i++) s += `<path d="${slice(48, 35, i / 48 * 2 * Math.PI - Math.PI / 2, (i + 1) / 48 * 2 * Math.PI - Math.PI / 2 + .05)}" fill="${rc(i / 48)}"/>`;
  const a0 = -150 * Math.PI / 180, a1 = -55 * Math.PI / 180, [sx, sy] = pt(33, a0), [ex, ey] = pt(33, a1);
  return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${sx.toFixed(2)}" y1="${sy.toFixed(2)}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}"><stop offset="0" stop-color="${SWEEP}" stop-opacity="0"/><stop offset="1" stop-color="${SWEEP}" stop-opacity=".55"/></linearGradient></defs>${s}` +
    `<g class="sw"><path d="${slice(33, 0, a0, a1)}" fill="url(#${id})"/><path d="M50 50L${ex.toFixed(2)} ${ey.toFixed(2)}" stroke="${SWEEP}" stroke-width="1.6" stroke-linecap="round" stroke-opacity=".8"/></g>` +
    `<circle cx="50" cy="50" r="25" fill="none" stroke="${SWEEP}" stroke-width=".8" stroke-opacity=".35"/>` +
    `<circle cx="66" cy="36" r="3.1" fill="${SWEEP}"/><circle cx="63" cy="62" r="2.4" fill="${CORAL}"/><circle cx="38" cy="34" r="1.9" fill="${SWEEP}"/>` +
    `<circle cx="50" cy="50" r="13" fill="${PUPIL}"/><circle cx="46.1" cy="45.6" r="2.86" fill="#fff"/>`;
}
// Redução (abaixo de 50 px): só o anel de gomos, a pupila maior e o brilho. Sem varredura, círculo-guia e pontos: somem nesse tamanho.
export function radarMin() {
  let s = ""; for (let i = 0; i < 48; i++) s += `<path d="${slice(49, 33, i / 48 * 2 * Math.PI - Math.PI / 2, (i + 1) / 48 * 2 * Math.PI - Math.PI / 2 + .05)}" fill="${rc(i / 48)}"/>`;
  return s + `<circle cx="50" cy="50" r="16" fill="${PUPIL}"/><circle cx="45.2" cy="44.6" r="3.6" fill="#fff"/>`;
}
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>\n`;
const word = (x, y, size, ink, anchor = "start", ls = .34) => `<text x="${x}" y="${y}" font-family="Urbanist, 'Helvetica Neue', Arial, sans-serif" font-weight="500" font-size="${size}" letter-spacing="${(size * ls).toFixed(2)}" fill="${ink}" text-anchor="${anchor}">IRIS<tspan fill="${YELLOW}">A</tspan></text>`;
const tag = (x, y, size, muted, anchor = "start") => `<text x="${x}" y="${y}" font-family="'Space Grotesk', 'Helvetica Neue', Arial, sans-serif" font-weight="400" font-size="${size}" fill="${muted}" text-anchor="${anchor}">quanta cor tem aqui?</text>`;

mkdirSync("docs/marca", { recursive: true });
for (const [bg, ink, muted] of [["paper", INK, "#3D4560"], ["night", "#FFFFFF", "#C9CCDA"]]) {
  const fundo = bg === "paper" ? PAPER : NIGHT;
  // 1 · vertical: símbolo 132, IRISA 26/.34em, tagline 14 (proporções da abertura)
  writeFileSync(`docs/marca/irisa-vertical-${bg}.svg`, svg(300, 300, `<rect width="300" height="300" fill="${fundo}"/><g transform="translate(84 46) scale(1.32)">${radar("v" + bg)}</g>${word(150 + 4.4, 219, 26, ink, "middle")}${tag(150, 248, 14, muted, "middle")}`));
  // 2 · horizontal: símbolo 48, IRISA 26/.24em à direita, alinhados pelo centro
  writeFileSync(`docs/marca/irisa-horizontal-${bg}.svg`, svg(300, 100, `<rect width="300" height="100" fill="${fundo}"/><g transform="translate(60 26) scale(.48)">${radar("h" + bg)}</g>${word(124, 60, 28, ink, "start", .24)}`));
  // 3 · redução: símbolo simplificado 40 + IRISA 20/.2em (assinatura de post, rodapé)
  writeFileSync(`docs/marca/irisa-reducao-${bg}.svg`, svg(220, 64, `<rect width="220" height="64" fill="${fundo}"/><g transform="translate(24 12) scale(.4)">${radarMin()}</g>${word(78, 40, 20, ink, "start", .2)}`));
  writeFileSync(`docs/marca/simbolo-${bg}.svg`, svg(100, 100, `<rect width="100" height="100" fill="${fundo}"/>${radar("s" + bg)}`));
  writeFileSync(`docs/marca/simbolo-reducao-${bg}.svg`, svg(100, 100, `<rect width="100" height="100" fill="${fundo}"/>${radarMin()}`));
}
// fragmentos para as peças (rodapé de lâmina e reels): <symbol> completo e reduzido
writeFileSync(".claude/skills/irisa-posts/radar.svgfrag", `<svg style="position:absolute;width:0;height:0" aria-hidden="true"><defs><symbol id="radarmark" viewBox="0 0 100 100">${radar("swm")}</symbol><symbol id="radarmin" viewBox="0 0 100 100">${radarMin()}</symbol></defs></svg>\n`);
console.log("docs/marca/*.svg e radar.svgfrag gerados");
