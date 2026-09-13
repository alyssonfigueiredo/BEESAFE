// Design system "Vibrant Alliance". Fonte única de cores e fontes: usado pelo Tailwind e pelo código.
// Paleta clara: fundo papel, cartões brancos, o azul-noite vira cor de texto e do mapa.
const colors = {
  paper: "#FAF9F6", // fundo das telas
  surface: "#FFFFFF", // cartões, barra de abas, campos
  subtle: "#F1EDE7", // preenchimentos de apoio
  border: "#E4DED5",
  night: "#1E2340", // cor escura: texto sobre cor, traços do mapa, fundo do mapa
  ink: "#1E2340", // texto principal
  muted: "#4F576F", // texto secundário
  dim: "#8A90A2", // texto de apoio e placeholders
  // acentos: versão clara para preenchimento
  coral: "#F4736F",
  orange: "#F5A45D",
  yellow: "#F0CA75",
  turquoise: "#5CC9B4",
  lilac: "#AE96F2",
  // acentos: versão escura para texto e ícones sobre fundo claro (contraste AA)
  coralInk: "#B23C3A",
  orangeInk: "#96601C",
  yellowInk: "#8A6512",
  turquoiseInk: "#1B7A6E",
  lilacInk: "#6D4FD8",
  star: "#E0A32E", // estrelas de avaliação sobre fundo claro
};

// Marca (símbolo íris-radar): o anel tem um azul de passagem que não é cor de interface.
const mark = {
  ring: ["#F4736F", "#F5A45D", "#F0CA75", "#5CC9B4", "#6AA8EE", "#AE96F2"],
  sweep: "#5CC9B4",
  pupil: "#161B2E",
};

const fonts = {
  wordmark: "Urbanist_500Medium", // logotipo IRISA: geométrica de ombros suaves
  display: "Oswald_700Bold",
  heading: "Oswald_500Medium",
  body: "SpaceGrotesk_400Regular",
  bodyMedium: "SpaceGrotesk_500Medium",
  bodyBold: "SpaceGrotesk_700Bold",
};

module.exports = { colors, fonts, mark };
