// Medalhas da gamificação: o mesmo desenho de docs/pingentes.js (fonte única do visual na proposta),
// em TypeScript para o app. Cada medalha vira um SVG em texto, desenhado com <SvgXml>.
// Bloqueada = silhueta cinza (troca de cor no próprio texto, sem filtro: o react-native-svg não
// garante feColorMatrix em todos os aparelhos). Ids de gradiente únicos: no react-native-svg eles
// são globais entre instâncias.

export type Banho = "neon" | "holo" | "dourado";
export type Medalha = {
  id: string;
  t: string;
  flex?: [string, string, string];
  art: string;
  cat: string;
  rar: string;
  cond: string;
  obj: string;
  copy: string;
};
type Art = [number, string];

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
};
const R = `stroke="${C.rim}" stroke-width="2" stroke-linejoin="round"`;
const star = (cx: number, cy: number, ro: number, ri: number, n = 5) => {
  let d = "";
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? ri : ro,
      a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    d +=
      (i ? "L" : "M") + (cx + r * Math.cos(a)).toFixed(1) + " " + (cy + r * Math.sin(a)).toFixed(1);
  }
  return d + "Z";
};
const heart = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.9}C${cx - s * 1.3} ${cy + s * 0.1} ${cx - s * 1.1} ${cy - s * 0.95} ${cx} ${cy - s * 0.45}C${cx + s * 1.1} ${cy - s * 0.95} ${cx + s * 1.3} ${cy + s * 0.1} ${cx} ${cy + s * 0.9}Z`;
// Texto dentro do objeto, nas fontes que o app carrega (Oswald_700Bold / Oswald_500Medium).
const T = (x: number, y: number, s: number, txt: string, fill = "#fff", extra = "") =>
  `<text x="${x}" y="${y}" font-family="${extra ? "Oswald_500Medium" : "Oswald_700Bold"}" font-size="${s}" fill="${fill}" text-anchor="middle">${txt}</text>`;
const GOMOS = [
  "#ff6964",
  "#ff8e5a",
  "#ffa353",
  "#ffbf5f",
  "#ffd066",
  "#bed582",
  "#74d6a4",
  "#49dcc0",
  "#4fcbdc",
  "#52b4f5",
  "#59a7ff",
  "#7d96ff",
  "#a889ff",
  "#c681dd",
  "#ea709b",
  "#ff636e",
];

const ART: Record<string, (G: string) => Art> = {
  cracha: (G: string): Art => [
    21,
    `<rect x="22" y="30" width="56" height="44" rx="7" fill="${C.white}" ${R}/><path d="M22 45v-8a7 7 0 0 1 7-7h42a7 7 0 0 1 7 7v8Z" fill="${C.coral}" ${R}/>${T(50, 42, 10, "OLÁ")}<path d="M31 61c4-7 8 5 12-2s6 5 10-1 6 4 13-2" fill="none" stroke="${C.night}" stroke-width="2.6" stroke-linecap="round"/><rect x="44" y="21" width="12" height="12" rx="3" fill="${G}" ${R}/>`,
  ],
  camera: (G: string): Art => [
    29,
    `<path d="M36 37l4-8h20l4 8Z" fill="${C.night}" ${R}/><rect x="20" y="36" width="60" height="40" rx="8" fill="${C.night}" ${R}/><circle cx="50" cy="56" r="15" fill="${G}" ${R}/><circle cx="50" cy="56" r="9.5" fill="${C.turq}" stroke="${C.night}" stroke-width="2"/><circle cx="46.6" cy="52.6" r="2.8" fill="#fff"/><rect x="25" y="41" width="9" height="6" rx="2" fill="${C.yellow}"/><path d="${star(79, 30, 9, 2.6, 4)}" fill="${C.yellow}" ${R}/>`,
  ],
  figurinha: (G: string): Art => [
    26,
    `<g transform="rotate(-6 50 60)"><path d="M27 28h46v60H41L27 74Z" fill="${C.white}" ${R}/><rect x="32" y="33" width="36" height="34" rx="3" fill="${C.lilac}"/><path d="${star(50, 50, 11, 4.6)}" fill="#fff"/>${T(61, 80, 9, "07", C.night)}<path d="M27 74h14v14Z" fill="#D9D3C7" ${R}/></g>`,
  ],
  oculos: (G: string): Art => [
    44,
    `<path d="M18 52l-4-6M82 52l4-6" stroke="${G}" stroke-width="3.4" stroke-linecap="round"/><path d="M43 52q7-6 14 0" fill="none" stroke="${G}" stroke-width="3.4" stroke-linecap="round"/><path d="${heart(31, 58, 15)}" fill="${C.coral}" ${R}/><path d="${heart(69, 58, 15)}" fill="${C.coral}" ${R}/><path d="${heart(31, 58, 10)}" fill="${C.night}"/><path d="${heart(69, 58, 10)}" fill="${C.night}"/><path d="M24 54l5-4M62 54l5-4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  ],
  credencial: (G: string): Art => [
    28,
    `<rect x="30" y="28" width="40" height="58" rx="6" fill="${C.white}" ${R}/><rect x="43" y="32" width="14" height="4" rx="2" fill="#D9D3C7"/><rect x="31" y="42" width="38" height="15" fill="${C.coral}"/>${T(50, 54, 12, "VIP")}<g fill="${C.night}"><rect x="35" y="63" width="6" height="6"/><rect x="43" y="63" width="3" height="3"/><rect x="35" y="72" width="3" height="3"/><rect x="40" y="72" width="6" height="6"/><rect x="47" y="67" width="3" height="3"/></g><path d="${star(61, 72, 7, 3)}" fill="${G}" ${R}/>`,
  ],
  orelhao: (G: string): Art => [
    26,
    `<path d="M50 26c16 0 24 14 24 30 0 10-3 18-6 24H32c-3-6-6-14-6-24 0-16 8-30 24-30Z" fill="${C.orange}" ${R}/><path d="M50 37c9 0 14 9 14 20 0 8-2 15-4 21H40c-2-6-4-13-4-21 0-11 5-20 14-20Z" fill="#FFE3BF"/><rect x="45" y="50" width="13" height="20" rx="3" fill="${C.night}"/><rect x="40" y="46" width="5" height="17" rx="2.5" fill="${C.night}"/><g fill="#fff"><circle cx="49" cy="56" r="1.2"/><circle cx="54" cy="56" r="1.2"/><circle cx="49" cy="61" r="1.2"/><circle cx="54" cy="61" r="1.2"/></g>`,
  ],
  carimbo: (G: string): Art => [
    30,
    `<g transform="rotate(-12 50 60)"><circle cx="50" cy="60" r="30" fill="${G}" ${R}/><circle cx="50" cy="60" r="25" fill="${C.white}"/><circle cx="50" cy="60" r="20" fill="none" stroke="${C.coral}" stroke-width="1.6" stroke-dasharray="3 2.4"/>${T(50, 64, 11, "DEFERIDO", C.coral)}<path d="${star(50, 47, 4, 1.7)}" fill="${C.coral}"/><path d="${star(50, 74, 4, 1.7)}" fill="${C.coral}"/></g>`,
  ],
  buque: (G: string): Art => {
    const fl = (x: number, y: number, c: string, core: string) =>
      [0, 72, 144, 216, 288]
        .map(
          (a) =>
            `<circle cx="${(x + 6 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(y + 6 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="5.2" fill="${c}" ${R.replace('2"', '1.2"')}/>`,
        )
        .join("") + `<circle cx="${x}" cy="${y}" r="3.6" fill="${core}"/>`;
    return [
      24,
      `<path d="M42 56l-6-10M50 56V40M58 56l6-10" stroke="#0A8B7A" stroke-width="2.4"/><ellipse cx="36" cy="58" rx="7" ry="3.4" fill="${C.turq}" transform="rotate(-30 36 58)"/><ellipse cx="64" cy="58" rx="7" ry="3.4" fill="${C.turq}" transform="rotate(30 64 58)"/>${fl(36, 44, C.coral, C.yellow)}${fl(64, 44, C.lilac, C.yellow)}${fl(50, 33, C.yellow, C.orange)}<path d="M34 56L50 96L66 56Z" fill="${C.white}" ${R}/><path d="M44 72q6 4 12 0l-2 8q-4-2-8 0Z" fill="${C.coral}" ${R}/>`,
    ];
  },
  pinCoroa: (G: string): Art => [
    22,
    `<path d="M50 94C40 80 28 68 28 54a22 22 0 0 1 44 0c0 14-12 26-22 40Z" fill="${C.turq}" ${R}/><circle cx="50" cy="54" r="9" fill="#fff" ${R}/><path d="M37 34l3-11 6 6 4-8 4 8 6-6 3 11Z" fill="${G}" ${R}/><circle cx="50" cy="54" r="3.4" fill="${C.coral}"/>`,
  ],
  busto: (G: string): Art => [
    28,
    `<circle cx="50" cy="40" r="11" fill="${G}" ${R}/><path d="M31 70c2-13 10-17 19-17s17 4 19 17Z" fill="${G}" ${R}/><rect x="28" y="68" width="44" height="7" rx="2" fill="#D7D0E6" ${R}/><rect x="33" y="74" width="34" height="16" fill="#C3BAD9" ${R}/><path d="M38 44q-5-8 0-15M62 44q5-8 0-15" fill="none" stroke="${C.turq}" stroke-width="2.6" stroke-linecap="round"/>`,
  ],
  placaAzul: (G: string): Art => [
    34,
    `<ellipse cx="50" cy="60" rx="32" ry="26" fill="${G}" ${R}/><ellipse cx="50" cy="60" rx="26.5" ry="20.5" fill="${C.blue}" stroke="#fff" stroke-width="2"/>${T(50, 58, 8.6, "PATRIMÔNIO")}${T(50, 69, 8.6, "CULTURAL")}<path d="${star(50, 47, 3.6, 1.5)}" fill="#fff"/>`,
  ],
  placaBronze: (G: string): Art => [
    34,
    `<rect x="20" y="34" width="60" height="46" rx="4" fill="${G}" ${R}/><rect x="26" y="40" width="48" height="34" fill="#B07D25" stroke="${C.rim}" stroke-width="1.4"/>${T(50, 57, 10.5, "TOMBADO", "#FBE7A8")}<path d="M34 64h32" stroke="#FBE7A8" stroke-width="1.4"/>${T(50, 70.5, 5.6, "PROTEGIDO PELA COMUNIDADE", "#FBE7A8", 'font-weight="400"')}<g fill="#FBE7A8" stroke="${C.rim}" stroke-width="1"><circle cx="23.5" cy="37.5" r="2.2"/><circle cx="76.5" cy="37.5" r="2.2"/><circle cx="23.5" cy="76.5" r="2.2"/><circle cx="76.5" cy="76.5" r="2.2"/></g>`,
  ],
  tesoura: (G: string): Art => [
    32,
    `<path d="M14 54h32l-4 6 4 6H14Z" fill="${C.coral}" ${R}/><path d="M86 54H58l4 6-4 6h28Z" fill="${C.coral}" ${R}/><path d="M43 78L58 32M57 78L42 32" stroke="${C.rim}" stroke-width="7" stroke-linecap="round"/><path d="M43 78L58 32M57 78L42 32" stroke="${G}" stroke-width="4.6" stroke-linecap="round"/><circle cx="50" cy="56" r="2.6" fill="${C.night}"/><circle cx="40" cy="85" r="7" fill="none" stroke="${C.rim}" stroke-width="6.4"/><circle cx="60" cy="85" r="7" fill="none" stroke="${C.rim}" stroke-width="6.4"/><circle cx="40" cy="85" r="7" fill="none" stroke="${G}" stroke-width="4"/><circle cx="60" cy="85" r="7" fill="none" stroke="${G}" stroke-width="4"/>`,
  ],
  lampada: (G: string): Art => [
    26,
    `<circle cx="50" cy="46" r="30" fill="${C.yellow}" opacity=".28"/><path d="M50 26a20 20 0 0 1 12 36c-2 2-3 5-3 8H41c0-3-1-6-3-8a20 20 0 0 1 12-36Z" fill="${C.yellow}" ${R}/><path d="M43 56l3.5-7 3.5 7 3.5-7 3.5 7" fill="none" stroke="${C.orange}" stroke-width="2" stroke-linejoin="round"/><path d="M42 36a10 10 0 0 1 6-4" stroke="#fff" stroke-width="2.6" stroke-linecap="round" fill="none"/><rect x="41" y="70" width="18" height="14" rx="2" fill="${G}" ${R}/><path d="M41 75h18M41 80h18" stroke="${C.rim}" stroke-width="1.4"/><path d="M45 84h10l-2 5h-6Z" fill="${C.night}"/>`,
  ],
  bussola: (G: string): Art => [
    30,
    `<circle cx="50" cy="60" r="29" fill="${G}" ${R}/><circle cx="50" cy="60" r="22.5" fill="${C.white}"/><g stroke="${C.night}" stroke-width="2"><path d="M50 40v4M50 76v4M30 60h4M66 60h4"/></g>${T(50, 49.5, 7, "N", C.night)}<path d="M50 42l6.5 18H43.5Z" fill="${C.coral}" ${R.replace('2"', '1.2"')}/><path d="M50 78l6.5-18H43.5Z" fill="${C.night}"/><circle cx="50" cy="60" r="2.8" fill="${G}" ${R.replace('2"', '1"')}/>`,
  ],
  porta: (G: string): Art => [
    28,
    `<path d="M62 30l12-6v62l-12-2Z" fill="${C.yellow}" opacity=".55"/><rect x="28" y="28" width="36" height="60" rx="3" fill="#FFE9A8" ${R}/><path d="M28 28l26 5v51l-26 4Z" fill="${C.turq}" ${R}/><circle cx="48" cy="60" r="2.8" fill="${G}" ${R.replace('2"', '1"')}/><rect x="33" y="38" width="15" height="16" rx="1.5" fill="none" stroke="#0A8B7A" stroke-width="1.6"/><rect x="33" y="64" width="15" height="16" rx="1.5" fill="none" stroke="#0A8B7A" stroke-width="1.6"/>`,
  ],
  pulseiraFesta: (G: string): Art => [
    40,
    `<ellipse cx="50" cy="60" rx="27" ry="19" fill="none" stroke="${C.rim}" stroke-width="12"/><ellipse cx="50" cy="60" rx="27" ry="19" fill="none" stroke="${C.lilac}" stroke-width="8.4"/><ellipse cx="50" cy="60" rx="27" ry="19" fill="none" stroke="#fff" stroke-width="1" stroke-dasharray="1 5" opacity=".7"/><rect x="38" y="68" width="24" height="16" rx="2" fill="${C.white}" ${R}/><g stroke="${C.night}" stroke-width="1.6"><path d="M42 71v10M45 71v10M47 71v10M51 71v10M53 71v10M57 71v10M59 71v10"/></g>`,
  ],
  chave: (G: string): Art => [
    24,
    `<path d="M57 38q14-4 20 6" fill="none" stroke="${C.night}" stroke-width="1.4"/><g transform="rotate(16 74 52)"><rect x="63" y="44" width="22" height="15" rx="3" fill="${C.coral}" ${R}/>${T(74, 55.5, 9, "Nº 1")}</g><circle cx="50" cy="36" r="10" fill="none" stroke="${C.rim}" stroke-width="8"/><circle cx="50" cy="36" r="10" fill="none" stroke="${G}" stroke-width="5"/><rect x="47" y="46" width="6" height="40" rx="2" fill="${G}" ${R}/><path d="M53 70h8v4h-8M53 78h6v4h-6" fill="${G}" ${R}/>`,
  ],
  mapa: (G: string): Art => [
    30,
    `<path d="M22 34l18-4v52l-18 4Z" fill="${C.white}" ${R}/><path d="M40 30l20 6v52l-20-6Z" fill="#C4F3E9" ${R}/><path d="M60 36l18-4v52l-18 4Z" fill="${C.white}" ${R}/><path d="M28 76c8-10 14 4 22-10s12-4 15-14" fill="none" stroke="${C.coral}" stroke-width="2.4" stroke-dasharray="1 4.4" stroke-linecap="round"/><path d="M63 40l9 9M72 40l-9 9" stroke="${C.coral}" stroke-width="3.8" stroke-linecap="round"/>`,
  ],
  mala: (G: string): Art => [
    28,
    `<path d="M40 42v-8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8" fill="none" stroke="${C.rim}" stroke-width="6"/><path d="M40 42v-8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8" fill="none" stroke="${G}" stroke-width="3.6"/><rect x="22" y="42" width="56" height="42" rx="7" fill="${C.orange}" ${R}/><path d="M34 42v42M66 42v42" stroke="#D9772E" stroke-width="3"/><circle cx="44" cy="58" r="6.5" fill="${C.turq}" ${R.replace('2"', '1.2"')}/><rect x="49" y="64" width="13" height="9" rx="2" fill="${C.lilac}" transform="rotate(-10 55 68)" ${R.replace('2"', '1.2"')}/><path d="${star(57, 52, 5, 2.2)}" fill="${C.yellow}" ${R.replace('2"', '1"')}/>`,
  ],
  cartaoPonto: (G: string): Art => [
    26,
    `<rect x="30" y="26" width="40" height="62" rx="4" fill="${C.white}" ${R}/><path d="M30 38v-8a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v8Z" fill="${C.coral}"/>${T(50, 35.5, 7.2, "PONTO")}${[0, 1, 2, 3, 4, 5, 6].map((i) => `<path d="M35 ${44 + i * 6.3}h20" stroke="#D9D3C7" stroke-width="1.6"/><circle cx="62" cy="${44 + i * 6.3}" r="2.3" fill="${C.night}"/>`).join("")}`,
  ],
  capacho: (G: string): Art => [
    42,
    `<g stroke="#B5832F" stroke-width="1.8">${[46, 51, 56, 61, 66, 71, 76].map((y) => `<path d="M14 ${y}h5M81 ${y}h5"/>`).join("")}</g><rect x="18" y="42" width="64" height="38" rx="5" fill="#E7B867" ${R}/><rect x="23" y="47" width="54" height="28" rx="3" fill="none" stroke="#B5832F" stroke-width="1.4" stroke-dasharray="2 2"/>${T(50, 65, 10.5, "BEM-VINDE", C.night)}`,
  ],
  almofada: (G: string): Art => [
    32,
    `<path d="${heart(50, 60, 24)}" fill="${C.coral}" ${R}/><path d="${heart(50, 60, 18)}" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 3"/><path d="M35 50q3-6 9-6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".8"/><circle cx="50" cy="83" r="3" fill="${G}" ${R.replace('2"', '1"')}/>`,
  ],
  leque: (G: string): Art => {
    let s = "";
    const n = 8,
      cx = 50,
      cy = 82,
      r = 38;
    for (let i = 0; i < n; i++) {
      const a0 = ((200 + (140 / n) * i) * Math.PI) / 180,
        a1 = ((200 + (140 / n) * (i + 1)) * Math.PI) / 180;
      s += `<path d="M${cx} ${cy}L${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)}A${r} ${r} 0 0 1 ${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)}Z" fill="${i % 2 ? C.white : C.lilac}" ${R.replace('2"', '1.4"')}/>`;
    }
    return [
      44,
      s +
        `<path d="M${cx - 31} ${cy - 22}A${r - 1} ${r - 1} 0 0 1 ${cx + 31} ${cy - 22}" fill="none" stroke="${G}" stroke-width="3" stroke-dasharray="2 3"/><rect x="45" y="78" width="10" height="14" rx="3" fill="${G}" ${R}/>`,
    ];
  },
  olho: (G: string): Art => {
    let s = `<circle cx="50" cy="60" r="29.5" fill="${G}" ${R}/><circle cx="50" cy="60" r="26" fill="${C.white}"/>`;
    for (let i = 0; i < 16; i++) {
      const a0 = ((-90 + 22.5 * i) * Math.PI) / 180,
        a1 = a0 + (19 * Math.PI) / 180,
        P = (r: number, a: number) =>
          (50 + r * Math.cos(a)).toFixed(2) + " " + (60 + r * Math.sin(a)).toFixed(2);
      s += `<path d="M${P(25, a0)}A25 25 0 0 1 ${P(25, a1)}L${P(17, a1)}A17 17 0 0 0 ${P(17, a0)}Z" fill="${GOMOS[i]}"/>`;
    }
    return [
      30,
      s +
        `<circle cx="50" cy="60" r="8.5" fill="#0F1220"/><circle cx="47.5" cy="57.2" r="2" fill="#fff"/>`,
    ];
  },
  latas: (G: string): Art => [
    20,
    `<path d="M28 50C28 22 72 22 72 50" fill="none" stroke="${C.night}" stroke-width="1.6"/><rect x="18" y="50" width="20" height="30" rx="2" fill="${C.turq}" ${R}/><ellipse cx="28" cy="50" rx="10" ry="3.4" fill="${G}" ${R}/><rect x="62" y="50" width="20" height="30" rx="2" fill="${C.coral}" ${R}/><ellipse cx="72" cy="50" rx="10" ry="3.4" fill="${G}" ${R}/><path d="M18 60h20M18 70h20M62 60h20M62 70h20" stroke="#fff" stroke-width="1.2" opacity=".6"/>`,
  ],
  estandarte: (G: string): Art => [
    19,
    `<path d="M50 22v70" stroke="${C.rim}" stroke-width="5" stroke-linecap="round"/><path d="M50 22v70" stroke="${G}" stroke-width="3" stroke-linecap="round"/><path d="M30 30h40" stroke="${G}" stroke-width="3.4" stroke-linecap="round"/><circle cx="50" cy="21" r="3.6" fill="${G}" ${R.replace('2"', '1.2"')}/><path d="M32 32h36v38l-18 12-18-12Z" fill="${C.lilac}" ${R}/><path d="M33 70l17 11 17-11" fill="none" stroke="${G}" stroke-width="2" stroke-dasharray="1.6 2"/><path d="${star(50, 50, 9, 3.8)}" fill="${C.yellow}" ${R.replace('2"', '1.2"')}/>`,
  ],
  bandeja: (G: string): Art => [
    36,
    `<path d="M28 46h22l-11 14Z" fill="${C.coral}" ${R}/><path d="M39 60v14M33 76h12" stroke="${G}" stroke-width="2.6" stroke-linecap="round"/><path d="M58 38h11l-1 20a4.5 4.5 0 0 1-9 0Z" fill="${C.yellow}" ${R}/><path d="M63.5 62.5v11M58 75.5h11" stroke="${G}" stroke-width="2.6" stroke-linecap="round"/><ellipse cx="50" cy="80" rx="34" ry="8" fill="${G}" ${R}/><ellipse cx="50" cy="78.6" rx="27" ry="4.6" fill="none" stroke="#FBE7A8" stroke-width="1.4"/><path d="${star(76, 40, 6, 1.8, 4)}" fill="${C.yellow}"/>`,
  ],
  tiara: (G: string): Art => [
    38,
    `<path d="M22 76L30 52L40 66L50 40L60 66L70 52L78 76Q50 66 22 76Z" fill="${G}" ${R}/><path d="M22 76Q50 66 78 76L76 82Q50 72 24 82Z" fill="${G}" ${R}/><circle cx="50" cy="46" r="4.4" fill="${C.coral}" ${R.replace('2"', '1.2"')}/><circle cx="30" cy="56" r="3.2" fill="${C.turq}" ${R.replace('2"', '1"')}/><circle cx="70" cy="56" r="3.2" fill="${C.lilac}" ${R.replace('2"', '1"')}/><circle cx="40" cy="70" r="2.4" fill="#fff"/><circle cx="60" cy="70" r="2.4" fill="#fff"/><circle cx="50" cy="68" r="3" fill="${C.blue}"/>`,
  ],
  agenda: (G: string): Art => {
    const cores = [C.coral, C.orange, C.yellow, C.turq, C.blue, C.lilac],
      marc = [1, 6, 9, 14, 17, 22];
    let g = "";
    for (let i = 0; i < 24; i++) {
      const x = 30 + (i % 6) * 8,
        y = 50 + Math.floor(i / 6) * 8,
        k = marc.indexOf(i);
      g +=
        k >= 0
          ? `<circle cx="${x + 2}" cy="${y + 2}" r="3.4" fill="${cores[k]}"/>`
          : `<rect x="${x}" y="${y}" width="4" height="4" rx="1" fill="#D9D3C7"/>`;
    }
    return [
      26,
      `<rect x="24" y="32" width="52" height="52" rx="6" fill="${C.white}" ${R}/><path d="M24 45v-7a6 6 0 0 1 6-6h40a6 6 0 0 1 6 6v7Z" fill="${C.coral}" ${R}/><rect x="35" y="26" width="5" height="11" rx="2.5" fill="${G}" ${R.replace('2"', '1.2"')}/><rect x="60" y="26" width="5" height="11" rx="2.5" fill="${G}" ${R.replace('2"', '1.2"')}/>${g}`,
    ];
  },
};

const TINT: Record<string, string> = {
  Trajetória: "#FFE1DF",
  Reconhecimento: "#ECE5FF",
  Cidade: "#D9F7F0",
  Mapa: "#FFF2CF",
  Rolê: "#FFE8D3",
  Constância: "#DEEDFF",
  Apoio: "#FFE3EC",
  Veterania: "#FBEFD0",
};

let seq = 0;
const RING: Record<"padrao" | Banho, string[]> = {
  padrao: ["#FF6964", "#FFA353", "#FFD066", "#49DCC0", "#59A7FF", "#A889FF"],
  neon: ["#FF2E88", "#FF6964", "#FFD066", "#2EF2C8", "#59A7FF", "#B46BFF"],
  holo: ["#FFD6E8", "#D6F0FF", "#E7D6FF", "#D6FFEA", "#FFF2C7", "#FFD6E8"],
  dourado: ["#FBE7A8", "#E2B04A", "#A97A1E", "#E2B04A", "#FBE7A8", "#E2B04A"],
};

/** SVG (texto) da medalha: disco com o objeto, anel de progresso (bloqueada) ou anel cheio. */
export function medalXml(
  art: string,
  {
    state = "on",
    prog = 0,
    cat = "Trajetória",
    lockIcon = true,
    banho = null,
  }: {
    state?: "on" | "lock";
    prog?: number;
    cat?: string;
    lockIcon?: boolean;
    banho?: Banho | null;
  } = {},
): string {
  const fn = ART[art];
  if (!fn) return "";
  const id = "md" + ++seq,
    G = `url(#${id}g)`,
    on = state === "on";
  let [, body] = fn(G);
  // silhueta: toda cor vira o mesmo cinza
  if (!on) body = body.replace(/(fill|stroke)="(?!none)[^"]*"/g, '$1="#C9C4BA"');
  const L = 2 * Math.PI * 55;
  const ring = RING[on && banho ? banho : "padrao"];
  const stops = ring
    .map((c, i) => `<stop offset="${(i / (ring.length - 1)).toFixed(2)}" stop-color="${c}"/>`)
    .join("");
  const arc = on
    ? `<circle cx="60" cy="60" r="55" fill="none" stroke="url(#${id}r)" stroke-width="${banho ? 6 : 4.5}"/>`
    : prog > 0
      ? `<circle cx="60" cy="60" r="55" fill="none" stroke="url(#${id}r)" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${(L * Math.min(prog, 1)).toFixed(1)} 999" transform="rotate(-90 60 60)"/>`
      : "";
  const halo =
    on && banho === "neon"
      ? `<circle cx="60" cy="60" r="58" fill="none" stroke="#FF2E88" stroke-opacity=".25" stroke-width="4"/>`
      : "";
  const disco = on
    ? banho === "dourado"
      ? "#FBEFD0"
      : banho === "holo"
        ? "#F1ECFF"
        : TINT[cat] || "#F3F0EA"
    : "#ECE9E3";
  const lk =
    !on && lockIcon
      ? `<circle cx="96" cy="96" r="13" fill="#141829" stroke="#fff" stroke-width="3"/><rect x="90.5" y="95" width="11" height="8.5" rx="2" fill="#fff"/><path d="M92.8 95v-2.6a3.2 3.2 0 0 1 6.4 0V95" fill="none" stroke="#fff" stroke-width="1.8"/>`
      : "";
  const s = 74 / 84;
  return (
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><defs>` +
    `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBE7A8"/><stop offset=".45" stop-color="#E2B04A"/><stop offset="1" stop-color="#A97A1E"/></linearGradient>` +
    `<linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>` +
    `<radialGradient id="${id}t" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="${disco}"/></radialGradient></defs>` +
    halo +
    (on ? "" : `<circle cx="60" cy="60" r="55" fill="none" stroke="#E7E3DC" stroke-width="4.5"/>`) +
    arc +
    `<circle cx="60" cy="60" r="47" fill="url(#${id}t)"/><circle cx="60" cy="60" r="46" fill="none" stroke="#fff" stroke-width="2" stroke-opacity=".9"/>` +
    `<g transform="translate(${(23 - 8 * s).toFixed(2)} ${(23 - 14 * s).toFixed(2)}) scale(${s.toFixed(4)})">${body}</g>${lk}</svg>`
  );
}

export const MEDALHAS: Medalha[] = [
  // Trajetória: avaliações válidas (contam depois de 48 h sem a moderação esconder)
  {
    id: "deu-o-nome",
    t: "Deu o Nome",
    art: "cracha",
    cat: "Trajetória",
    rar: "comum",
    cond: "Primeira avaliação válida.",
    obj: "Crachá de festa “Olá” com o nome rabiscado.",
    copy: "Prazer. Agora o mapa sabe o que você acha.",
  },
  {
    id: "deu-close",
    t: "Deu Close",
    art: "camera",
    cat: "Trajetória",
    rar: "comum",
    cond: "10 avaliações, em pelo menos 2 semanas diferentes.",
    obj: "Câmera com flash e um brilhinho.",
    copy: "Dez lugares, dez closes. O mapa agradece.",
  },
  {
    id: "figurinha",
    t: "Figurinha Conhecida",
    art: "figurinha",
    cat: "Trajetória",
    rar: "incomum",
    cond: "15 avaliações, em pelo menos 3 semanas diferentes.",
    obj: "Figurinha de álbum com o canto descolando.",
    copy: "Se o mapa fosse álbum, você já era figurinha conhecida.",
  },
  {
    id: "famosinha",
    t: "Famosinha",
    flex: ["Famosinha", "Famosinho", "Famosinhe"],
    art: "oculos",
    cat: "Trajetória",
    rar: "rara",
    cond: "30 avaliações, em pelo menos 4 semanas diferentes.",
    obj: "Óculos escuros de coração.",
    copy: "Óculos escuros, por favor. O flash não para.",
  },
  {
    id: "influ-do-vale",
    t: "Influ do Vale",
    art: "credencial",
    cat: "Trajetória",
    rar: "epica",
    cond: "60 avaliações e 25 “ajudou” recebidos.",
    obj: "Credencial VIP com cordão.",
    copy: "O que você irisa, a cidade lê.",
  },
  // Reconhecimento: “ajudou” nas avaliações (novo, anônimo) + curtidas no mural (já existem)
  {
    id: "utilidade-publica",
    t: "Utilidade Pública",
    art: "orelhao",
    cat: "Reconhecimento",
    rar: "incomum",
    cond: "10 “ajudou” ou curtidas recebidos.",
    obj: "Orelhão em miniatura.",
    copy: "Declarado de utilidade pública. Sem burocracia.",
  },
  {
    id: "interesse-municipal",
    t: "Interesse Municipal",
    art: "carimbo",
    cat: "Reconhecimento",
    rar: "rara",
    cond: "50 “ajudou” ou curtidas recebidos.",
    obj: "Selo carimbado “DEFERIDO”.",
    copy: "Pedido deferido: você é de interesse municipal.",
  },
  {
    id: "aclamada",
    t: "Aclamada",
    flex: ["Aclamada", "Aclamado", "Aclamade"],
    art: "buque",
    cat: "Reconhecimento",
    rar: "epica",
    cond: "150 “ajudou” ou curtidas recebidos.",
    obj: "Buquê jogado no palco.",
    copy: "Aplausos de pé. A comunidade confia no seu olhar.",
  },
  {
    id: "favorita",
    t: "Favorita do Público",
    flex: ["Favorita do Público", "Favorito do Público", "Favorite do Público"],
    art: "tiara",
    cat: "Reconhecimento",
    rar: "epica",
    cond: "A avaliação com mais “ajudou” do mês na sua cidade.",
    obj: "Tiara de concurso.",
    copy: "A avaliação mais útil do mês na cidade foi a sua.",
  },
  // Cidade
  {
    id: "icone-local",
    t: "Ícone Local",
    art: "pinCoroa",
    cat: "Cidade",
    rar: "rara",
    cond: "Acendeu o selo (5ª avaliação) de 3 lugares na mesma cidade.",
    obj: "Alfinete de mapa com coroa.",
    copy: "Três selos acesos por você. Já é ícone local.",
  },
  {
    id: "lenda-local",
    t: "Lenda Local",
    art: "busto",
    cat: "Cidade",
    rar: "epica",
    cond: "Acendeu o selo de 10 lugares na mesma cidade.",
    obj: "Busto de praça no pedestal.",
    copy: "Já pode encomendar sua estátua na praça.",
  },
  {
    id: "mala-pronta",
    t: "Mala Pronta",
    art: "mala",
    cat: "Cidade",
    rar: "incomum",
    cond: "Avaliou lugares em 3 cidades. Cada cidade nova cola um adesivo na mala.",
    obj: "Mala de viagem com adesivos.",
    copy: "Mala pronta e o mapa na mão.",
  },
  // Mapa
  {
    id: "inaugurou",
    t: "Inaugurou",
    art: "tesoura",
    cat: "Mapa",
    rar: "comum",
    cond: "Primeira avaliação de 3 lugares que não tinham nenhuma, em pelo menos 2 semanas diferentes.",
    obj: "Tesourinha cortando a fita.",
    copy: "Corta a fita: esse lugar estreou no mapa com você.",
  },
  {
    id: "acendeu-a-luz",
    t: "Acendeu a Luz",
    art: "lampada",
    cat: "Mapa",
    rar: "incomum",
    cond: "Deu a 5ª avaliação, a que acende o selo do lugar.",
    obj: "Lâmpada de camarim.",
    copy: "O selo acendeu. Foi você que apertou o interruptor.",
  },
  {
    id: "eu-conheco",
    t: "Eu Conheço um Lugar",
    art: "mapa",
    cat: "Mapa",
    rar: "incomum",
    cond: "Cadastrou um lugar que faltava e outra pessoa avaliou.",
    obj: "Mapa dobrado com um X.",
    copy: "Ninguém conhecia. Agora tá no mapa.",
  },
  {
    id: "pode-entrar",
    t: "Pode Entrar",
    art: "porta",
    cat: "Mapa",
    rar: "rara",
    cond: "3 fotos aprovadas pela moderação.",
    obj: "Porta entreaberta com luz saindo.",
    copy: "Agora dá pra ver a porta antes de chegar.",
  },
  // Rolê
  {
    id: "sabe-onde-ir",
    t: "Sabe Onde Ir",
    art: "bussola",
    cat: "Rolê",
    rar: "incomum",
    cond: "Avaliou 4 categorias diferentes (bar, café, restaurante, hotel, balada).",
    obj: "Bússola.",
    copy: "Bar, café, hotel, restaurante. Sabe onde ir.",
  },
  {
    id: "nome-na-lista",
    t: "Nome na Lista",
    art: "pulseiraFesta",
    cat: "Rolê",
    rar: "incomum",
    cond: "Avaliou lugares em 6 bairros diferentes.",
    obj: "Pulseirinha de entrada de festa.",
    copy: "Seu nome tá na lista de seis bairros.",
  },
  {
    id: "da-casa",
    t: "Da Casa",
    art: "chave",
    cat: "Rolê",
    rar: "rara",
    cond: "Reavaliou o mesmo lugar depois de 6 meses. O nome do lugar aparece só no seu Perfil, nunca no cartão do story.",
    obj: "Chave de camarim com plaquinha “Nº 1”.",
    copy: "Da casa. Já pode pedir o de sempre.",
  },
  // Constância
  {
    id: "bateu-ponto",
    t: "Bateu Ponto",
    art: "cartaoPonto",
    cat: "Constância",
    rar: "comum",
    cond: "Primeira semana acesa: o app aberto em 4 dias quaisquer da semana.",
    obj: "Cartão de ponto perfurado.",
    copy: "Bateu ponto. E nem precisou ser todo dia.",
  },
  {
    id: "ja-mora-aqui",
    t: "Já Mora Aqui",
    art: "capacho",
    cat: "Constância",
    rar: "rara",
    cond: "4 semanas acesas, seguidas ou não.",
    obj: "Capacho “bem-vinde”.",
    copy: "Quatro semanas acesas. Já pode receber correspondência aqui.",
  },
  {
    id: "serviu-tudo",
    t: "Serviu Tudo",
    art: "bandeja",
    cat: "Constância",
    rar: "rara",
    cond: "Completou os 3 desafios do dia em 7 dias diferentes.",
    obj: "Bandeja com taças.",
    copy: "Serviu tudo. Literalmente.",
  },
  {
    id: "agenda-cheia",
    t: "Agenda Cheia",
    art: "agenda",
    cat: "Constância",
    rar: "epica",
    cond: "Abriu a Irisa nas 6 datas da comunidade do ano: 29/01, 17/05, 28/06, 29/08, 23/09, 11/10.",
    obj: "Calendário com seis dias marcados.",
    copy: "Presente em todas as datas que importam.",
  },
  // Apoio
  {
    id: "ombro-amigo",
    t: "Ombro Amigo",
    art: "almofada",
    cat: "Apoio",
    rar: "comum",
    cond: "10 mensagens de apoio no mural, sem denúncia aceita.",
    obj: "Almofadinha de coração.",
    copy: "Dez abraços deixados no mural.",
  },
  {
    id: "bateu-leque",
    t: "Bateu Leque",
    art: "leque",
    cat: "Apoio",
    rar: "rara",
    cond: "Mensagens de apoio em 10 semanas diferentes.",
    obj: "Leque aberto.",
    copy: "Abriu o leque pra comunidade.",
  },
  {
    id: "rede-de-apoio",
    t: "Rede de Apoio",
    art: "latas",
    cat: "Apoio",
    rar: "rara",
    cond: "3 pessoas entraram pelo seu convite.",
    obj: "Telefone de lata.",
    copy: "Três pessoas chegaram por você.",
  },
  {
    id: "olho-vivo",
    t: "Olho Vivo",
    art: "olho",
    cat: "Apoio",
    rar: "incomum",
    cond: "Consultou a ficha do bairro em 5 dias diferentes.",
    obj: "O olho da Irisa em miniatura.",
    copy: "Antes de sair, você olha. Isso é cuidado.",
  },
  // Veterania
  {
    id: "abre-alas",
    t: "Abre-Alas",
    art: "estandarte",
    cat: "Veterania",
    rar: "lendaria",
    cond: "Entrou na fase de testes. Depois do lançamento, ninguém mais consegue.",
    obj: "Estandarte de escola de samba.",
    copy: "Você abriu alas. Essa ninguém mais pega.",
  },
  {
    id: "patrimonio-cultural",
    t: "Patrimônio Cultural",
    art: "placaAzul",
    cat: "Veterania",
    rar: "lendaria",
    cond: "Completou o anel: os 48 gomos acesos.",
    obj: "Placa azul oval de patrimônio.",
    copy: "Oficialmente patrimônio cultural da comunidade.",
  },
  {
    id: "patrimonio-tombado",
    t: "Patrimônio Tombado",
    art: "placaBronze",
    cat: "Veterania",
    rar: "lendaria",
    cond: "Um ano de Irisa, contribuindo em 10 meses diferentes.",
    obj: "Placa de bronze com parafusos.",
    copy: "Patrimônio tombado. Agora ninguém mexe.",
  },
];

export const getMedalha = (id: string) => MEDALHAS.find((m) => m.id === id);
/** Nome com a flexão escolhida no Perfil (0 = a, 1 = o, 2 = e). */
export const nomeDa = (m: Medalha, forma: number) => (m.flex ? (m.flex[forma] ?? m.flex[2]) : m.t);
/** As 12 que entram no lançamento, na ordem da pulseira. */
export const LANCAMENTO = [
  "deu-o-nome",
  "deu-close",
  "figurinha",
  "famosinha",
  "inaugurou",
  "acendeu-a-luz",
  "eu-conheco",
  "nome-na-lista",
  "mala-pronta",
  "bateu-ponto",
  "ombro-amigo",
  "abre-alas",
];
export const NIVEIS = ["Cinza", "Coral", "Laranja", "Amarelo", "Turquesa", "Azul", "Arco-íris"];
