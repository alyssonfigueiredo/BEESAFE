// Design system "Vibrant Alliance". Fonte única de cores e fontes: usado pelo Tailwind e pelo código.
// Paleta clara: fundo papel, cartões brancos, o azul-noite vira cor de texto e do mapa.
//
// Os acentos são definidos na versão de referência (`accents`) e entram no app com a saturação
// HSL multiplicada por SATURATION (1.35 = cor viva, com teto em 100 %), decisão de 26/09/2026 junto
// com o Liquid Glass: cor cheia por baixo do vidro, tinta mais escura para definição. Mudar o
// número aqui muda o app inteiro (pastilhas, mapa, anel da marca) — os tons escuros de texto
// (`*Ink`) mantêm a luminosidade, então continuam passando no contraste AA.
const SATURATION = 1.35;

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToHex(h, s, l) {
  const f = (t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(f(h + 1 / 3))}${hex(f(h))}${hex(f(h - 1 / 3))}`.toUpperCase();
}

/** Mesma matiz e luminosidade, saturação multiplicada por `k`. */
function saturate(hex, k = SATURATION) {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, Math.min(1, s * k), l);
}

// Acentos na versão cheia: é daqui que saem ícone, splash e material de divulgação.
const accents = {
  coral: "#F4736F",
  orange: "#F5A45D",
  yellow: "#F0CA75",
  turquoise: "#5CC9B4",
  lilac: "#AE96F2",
  coralInk: "#B23C3A",
  orangeInk: "#96601C",
  yellowInk: "#8A6512",
  turquoiseInk: "#1B7A6E",
  lilacInk: "#6D4FD8",
  amber: "#E0A32E",
};

const colors = {
  paper: "#FAF9F6", // fundo das telas
  surface: "#FFFFFF", // cartões, barra de abas, campos
  subtle: "#F1EDE7", // preenchimentos de apoio
  border: "#D8D1C5", // um tom mais firme que antes: definição vem da linha
  night: "#141829", // cor escura: texto sobre cor, traços do mapa, fundo do mapa
  ink: "#141829", // texto principal, mais escuro que antes (definição)
  muted: "#3D4560", // texto secundário
  dim: "#7C8296", // texto de apoio e placeholders
  // acentos: versão clara para preenchimento
  coral: saturate(accents.coral),
  orange: saturate(accents.orange),
  yellow: saturate(accents.yellow),
  turquoise: saturate(accents.turquoise),
  lilac: saturate(accents.lilac),
  // acentos: versão escura para texto e ícones sobre fundo claro (contraste AA)
  coralInk: saturate(accents.coralInk),
  orangeInk: saturate(accents.orangeInk),
  yellowInk: saturate(accents.yellowInk),
  turquoiseInk: saturate(accents.turquoiseInk),
  lilacInk: saturate(accents.lilacInk),
  amber: saturate(accents.amber), // amarelo do logotipo abaixo de 20 px
};

// Marca (símbolo íris-radar): o anel tem um azul de passagem que não é cor de interface.
const mark = {
  ring: ["#F4736F", "#F5A45D", "#F0CA75", "#5CC9B4", "#6AA8EE", "#AE96F2"].map((c) => saturate(c)),
  sweep: colors.turquoise,
  pupil: "#0F1220",
};

// Vidro (Liquid Glass, iOS 26+; nos outros sistemas vira blur com véu branco): só nas camadas
// que flutuam sobre o conteúdo — cabeçalho, barra de abas, folhas modais. Cartão e botão são opacos.
const glass = {
  tint: "rgba(255,255,255,0.44)", // véu sobre o blur: fino, para o conteúdo aparecer por baixo
  tintStrong: "rgba(255,255,255,0.72)", // folhas modais, onde se lê texto longo
  edge: "rgba(255,255,255,0.90)", // fio de luz na borda
  tabBarHeight: 64,
  tabBarGap: 16, // distância da barra até a borda de baixo (além da área segura)
  radius: 32,
};

// Profundidade: cartão e botão cheio descolam do papel. Sombra dupla (contato + ambiente) no
// `boxShadow` nativo do RN 0.86, em `style` — o NativeWind não converte sombra dupla de className.
const shadow = {
  card: { boxShadow: "0 1px 2px rgba(20,24,41,0.06), 0 8px 24px rgba(20,24,41,0.10)" },
  lift: { boxShadow: "0 2px 4px rgba(20,24,41,0.08), 0 14px 36px rgba(20,24,41,0.16)" },
};

const fonts = {
  wordmark: "Urbanist_500Medium", // logotipo IRISA: geométrica de ombros suaves
  display: "Oswald_700Bold",
  heading: "Oswald_500Medium",
  body: "SpaceGrotesk_400Regular",
  bodyMedium: "SpaceGrotesk_500Medium",
  bodyBold: "SpaceGrotesk_700Bold",
};

module.exports = { colors, fonts, mark, glass, shadow, accents, saturate, SATURATION };
