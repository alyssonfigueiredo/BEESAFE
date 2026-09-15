// Desenho da marca Irisa (íris-radar) em SVG. Usado por gen-icons.mjs e gen-feature-graphic.mjs.

export const PAPER = "#FAF9F6";
export const INK = "#161B2E";
export const SWEEP = "#5CC9B4"; // varredura: turquesa, a cor de apoio no app
// anel: as cores do design system mais um azul de passagem, interpoladas em degradê contínuo
const RING = ["#F4736F", "#F5A45D", "#F0CA75", "#5CC9B4", "#6AA8EE", "#AE96F2"];

const lerp = (a, b, t) => {
  const A = a.slice(1),
    B = b.slice(1);
  let out = "#";
  for (let i = 0; i < 3; i++) {
    const x = parseInt(A.slice(i * 2, i * 2 + 2), 16),
      y = parseInt(B.slice(i * 2, i * 2 + 2), 16);
    out += Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
};
const ringColor = (t) => {
  const p = t * RING.length,
    i = Math.floor(p) % RING.length;
  return lerp(RING[i], RING[(i + 1) % RING.length], p - Math.floor(p));
};

const P = (r, a) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
// setor de anel (ri = 0 vira fatia cheia)
const slice = (ro, ri, a0, a1, fill, opacity) =>
  `<path d="M ${P(ro, a0)} A ${ro} ${ro} 0 0 1 ${P(ro, a1)} L ${P(ri, a1)} A ${ri} ${ri} 0 0 0 ${P(ri, a0)} Z" fill="${fill}"${
    opacity === undefined ? "" : ` fill-opacity="${opacity}"`
  }/>`;

const ring = (mono) => {
  const n = 96;
  let out = "";
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2 + 0.05; // sobreposição: evita costura entre as fatias
    out += slice(48, 35, a0, a1, mono ? "#fff" : ringColor(i / n));
  }
  return out;
};

// varredura com rastro: uma fatia só, com degradê do início do rastro até o feixe
const sweep = (color, maxOpacity, id) => {
  const start = (-150 * Math.PI) / 180,
    end = (-55 * Math.PI) / 180;
  const g0 = P(33, start).split(" "),
    g1 = P(33, end).split(" ");
  return (
    `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${g0[0]}" y1="${g0[1]}" x2="${g1[0]}" y2="${g1[1]}">` +
    `<stop offset="0%" stop-color="${color}" stop-opacity="0"/>` +
    `<stop offset="100%" stop-color="${color}" stop-opacity="${maxOpacity}"/></linearGradient></defs>` +
    slice(33, 0, start, end, `url(#${id})`) +
    `<path d="M 50 50 L ${P(33, end)}" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.75"/>`
  );
};

const blip = (x, y, r, color) =>
  `<circle cx="${x}" cy="${y}" r="${r * 2.1}" fill="${color}" fill-opacity="0.14"/>` +
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;

// `mono` = versão monocromática (Android).
export function mark({ size, bg, pad = 0, mono = false }) {
  const scale = 1 - pad;
  const line = mono ? "#fff" : SWEEP;

  let body = ring(mono);
  body += sweep(line, mono ? 0.28 : 0.5, `sw${size}${mono ? "m" : ""}`);
  body += `<circle cx="50" cy="50" r="25" fill="none" stroke="${line}" stroke-width="0.8" stroke-opacity="${mono ? 0.4 : 0.35}"/>`;
  body += blip(66, 36, 3.1, mono ? "#fff" : SWEEP);
  body += blip(63, 62, 2.4, mono ? "#fff" : "#F4736F");
  body += blip(38, 34, 1.9, mono ? "#fff" : SWEEP);
  // pupila escura com reflexo
  body += `<circle cx="50" cy="50" r="13" fill="${mono ? "#fff" : INK}"/>`;
  if (!mono) body += `<circle cx="46.1" cy="45.6" r="2.86" fill="#FFFFFF"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    ${bg === "transparent" ? "" : `<rect width="100" height="100" fill="${bg}"/>`}
    <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${body}</g></svg>`;
}
