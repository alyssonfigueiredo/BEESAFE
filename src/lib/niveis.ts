// Níveis de "Sua evolução" (04/10/2026, aprovado pelo Leandro; protótipo em docs/prototipo-evolucao.html).
// A íris de 48 gomos continua a mesma; o nível deixou de ser uma cor ("Coral", "Laranja"…) e virou um
// título com ícone, em 8 degraus. Calculado no app a partir dos gomos que o banco já devolve.
// Ícones no traço das medalhas (contorno dourado, cores da marca), sem emoji e sem bandeira.

export type Nivel = {
  /** Nome com flexão pelo pronome do Perfil (0 = a, 1 = o, 2 = e); um nome só vale para todos. */
  f: [string] | [string, string, string];
  /** Gomos para chegar. */
  g: number;
  t: string;
  icone: string;
};

const C = {
  coral: "#FF6964",
  orange: "#FFA353",
  yellow: "#FFD066",
  turq: "#49DCC0",
  blue: "#59A7FF",
  lilac: "#A889FF",
  night: "#1E2340",
  white: "#FFFDF8",
  rim: "#8A6418",
  green: "#3DBE8B",
};
const R = `stroke="${C.rim}" stroke-width="2.2" stroke-linejoin="round"`;
const star = (cx: number, cy: number, ro: number, ri: number, n = 4) => {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro,
      a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    d +=
      (i ? "L" : "M") + (cx + r * Math.cos(a)).toFixed(1) + " " + (cy + r * Math.sin(a)).toFixed(1);
  }
  return d + "Z";
};

const ICONES = [
  `<path d="M26 78h48l-5 12H31Z" fill="#C98A5B" ${R}/><path d="M50 78V54" stroke="${C.green}" stroke-width="4" stroke-linecap="round"/><path d="M50 60C36 60 28 50 28 38c14 0 22 8 22 22Z" fill="${C.turq}" ${R}/><path d="M50 54c0-14 8-24 24-24 0 14-8 24-24 24Z" fill="#7FE3A8" ${R}/><path d="${star(78, 22, 7, 2)}" fill="${C.yellow}" ${R}/>`,
  `<ellipse cx="33" cy="54" rx="17" ry="13" fill="${C.white}" ${R}/><ellipse cx="67" cy="54" rx="17" ry="13" fill="${C.white}" ${R}/><circle cx="36" cy="55" r="7" fill="${C.night}"/><circle cx="70" cy="55" r="7" fill="${C.night}"/><circle cx="38.5" cy="52.5" r="2.3" fill="#fff"/><circle cx="72.5" cy="52.5" r="2.3" fill="#fff"/><path d="M20 36l5 5M33 31v7M46 36l-5 5M54 36l5 5M67 31v7M80 36l-5 5" stroke="${C.night}" stroke-width="2.6" stroke-linecap="round"/>`,
  `<defs><linearGradient id="dropG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.coral}"/><stop offset=".35" stop-color="${C.yellow}"/><stop offset=".7" stop-color="${C.turq}"/><stop offset="1" stop-color="${C.lilac}"/></linearGradient></defs><path d="M50 16C50 16 24 48 24 64a26 26 0 0 0 52 0C76 48 50 16 50 16Z" fill="url(#dropG)" ${R}/><path d="M38 62a12 12 0 0 0 10 14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/><path d="${star(76, 26, 8, 2.4)}" fill="${C.yellow}" ${R}/>`,
  `<rect x="40" y="16" width="20" height="24" rx="4" fill="${C.night}" ${R}/><path d="M32 46a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v34a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8Z" fill="${C.coral}" ${R}/><path d="M38 52v26" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".75"/><path d="${star(78, 48, 8, 2.4)}" fill="${C.yellow}" ${R}/><path d="${star(22, 70, 6, 1.8)}" fill="${C.lilac}" ${R}/>`,
  `<path d="M18 26h50a8 8 0 0 1 8 8v26a8 8 0 0 1-8 8H42l-14 12V68H18a8 8 0 0 1-8-8V34a8 8 0 0 1 8-8Z" fill="${C.white}" ${R}/><path d="${star(30, 47, 7, 2.2, 5)}" fill="${C.coral}"/><path d="${star(46, 47, 7, 2.2, 5)}" fill="${C.yellow}"/><path d="${star(62, 47, 7, 2.2, 5)}" fill="${C.turq}"/><path d="M74 72c6 0 10 4 10 10" stroke="${C.lilac}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M76 62c10 0 16 6 16 16" stroke="${C.lilac}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
  `<path d="M14 30l22-6v58l-22 6Z" fill="${C.white}" ${R}/><path d="M36 24l28 8v58l-28-8Z" fill="#C4F3E9" ${R}/><path d="M64 32l22-6v58l-22 6Z" fill="${C.white}" ${R}/><path d="M24 74c8-12 16 2 24-12s14-6 18-16" fill="none" stroke="${C.night}" stroke-width="2.4" stroke-dasharray="1 4.5" stroke-linecap="round"/><g ${R}><path d="M24 44c0-6 10-6 10 0 0 5-5 10-5 10s-5-5-5-10Z" fill="${C.coral}"/><path d="M50 56c0-6 10-6 10 0 0 5-5 10-5 10s-5-5-5-10Z" fill="${C.yellow}"/><path d="M68 40c0-6 10-6 10 0 0 5-5 10-5 10s-5-5-5-10Z" fill="${C.lilac}"/></g>`,
  `<path d="M50 90c-18 0-28-12-28-28 0-14 10-22 14-34 4 8 8 12 12 12 0-10 4-20 12-28 2 14 18 24 18 48 0 18-10 30-28 30Z" fill="${C.orange}" ${R}/><path d="M50 90c-9 0-15-7-15-16 0-8 6-12 9-20 3 6 6 8 8 8 1-4 3-8 6-10 2 8 7 13 7 22 0 9-6 16-15 16Z" fill="${C.yellow}"/><path d="M50 90c-4 0-7-3-7-8s3-7 5-11c2 3 4 4 5 4 2 3 4 5 4 8 0 4-3 7-7 7Z" fill="${C.white}"/>`,
  `<path d="M18 40l14 14 18-26 18 26 14-14-6 42H24Z" fill="${C.yellow}" ${R}/><rect x="22" y="80" width="56" height="10" rx="3" fill="#E9B44C" ${R}/><circle cx="18" cy="38" r="5" fill="${C.coral}" ${R}/><circle cx="50" cy="26" r="6" fill="${C.turq}" ${R}/><circle cx="82" cy="38" r="5" fill="${C.lilac}" ${R}/><circle cx="36" cy="68" r="4" fill="${C.coral}"/><circle cx="50" cy="66" r="4.5" fill="${C.blue}"/><circle cx="64" cy="68" r="4" fill="${C.turq}"/>`,
];

const TEXTO: Omit<Nivel, "icone">[] = [
  { f: ["Curiosa", "Curioso", "Curiose"], g: 0, t: "Acabou de chegar. Ainda está descobrindo." },
  {
    f: ["Entendida", "Entendido", "Entendide"],
    g: 2,
    t: "Já começou a sacar como as coisas funcionam.",
  },
  { f: ["Irisada", "Irisado", "Irisade"], g: 5, t: "Já deixou suas primeiras cores pelo mapa." },
  { f: ["Close Certo"], g: 10, t: "Já tem propriedade pra falar." },
  { f: ["Do Babado"], g: 16, t: "Já conhece coisa que muita gente não conhece." },
  { f: ["Mapa Vivo"], g: 24, t: "Virou praticamente uma fonte da comunidade." },
  { f: ["Lenda Local"], g: 34, t: "Nome forte, difícil de chegar." },
  { f: ["Patrimônio LGBTQIA+"], g: 48, t: "O topo. A íris inteira acesa." },
];

export const NIVEIS_EVO: Nivel[] = TEXTO.map((n, i) => ({ ...n, icone: ICONES[i] }));

/** Índice do nível (0 a 7) para tantos gomos. */
export function nivelDe(gomos: number) {
  let i = 0;
  NIVEIS_EVO.forEach((n, k) => {
    if (gomos >= n.g) i = k;
  });
  return i;
}

export const nomeNivel = (n: Nivel, forma: number) =>
  n.f.length === 3 ? (n.f[forma] ?? n.f[2]) : n.f[0];

// Gradiente com id único por cópia: no react-native-svg os ids são globais entre instâncias.
let seq = 0;
export function iconeXml(k: number) {
  const id = "nv" + ++seq;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${ICONES[k].replace(/dropG/g, id)}</svg>`;
}
