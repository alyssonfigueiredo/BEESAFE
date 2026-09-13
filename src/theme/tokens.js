// Design system "Vibrant Alliance". Fonte única de cores e fontes: usado pelo Tailwind e pelo código.
const colors = {
  night: "#0B132B",
  surface: "#1C2540",
  border: "#3A506B",
  coral: "#FF5A5F",
  yellow: "#FFD166",
  orange: "#FF9F45",
  turquoise: "#5BC0BE",
  lilac: "#A78BFA",
  ink: "#FFFFFF",
  muted: "#CBD5E1",
  dim: "#94A3B8",
};

// Marca (símbolo íris-radar): o anel tem um azul de passagem que não é cor de interface.
const mark = {
  ring: ["#FF5A5F", "#FF9F45", "#FFD166", "#5CC9B4", "#6AA8EE", "#A78BFA"],
  sweep: "#5CC9B4",
};

const fonts = {
  display: "Oswald_700Bold",
  heading: "Oswald_500Medium",
  body: "SpaceGrotesk_400Regular",
  bodyMedium: "SpaceGrotesk_500Medium",
  bodyBold: "SpaceGrotesk_700Bold",
};

module.exports = { colors, fonts, mark };
