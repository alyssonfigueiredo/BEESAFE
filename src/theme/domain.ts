import { colors } from "./tokens";

// Os acentos claros servem de preenchimento (pastilhas, pontos do mapa). Como texto sobre papel
// eles não passam no contraste: `onLight` devolve a versão escura da mesma matiz.
const INK_OF: Record<string, string> = {
  [colors.coral]: colors.coralInk,
  [colors.orange]: colors.orangeInk,
  [colors.yellow]: colors.yellowInk,
  [colors.turquoise]: colors.turquoiseInk,
  [colors.lilac]: colors.lilacInk,
};

export function onLight(color: string) {
  return INK_OF[color] ?? color;
}

// Escala do marcador de nota (Rainbow/IrisScore): o anel da marca em cinco passos.
// A ordem é a do anel; a posição preenchida é que carrega o valor, não a cor.
export const SCALE = [
  colors.coral,
  colors.orange,
  colors.yellow,
  colors.turquoise,
  colors.lilac,
] as const;

export const OCCURRENCE_TYPES = {
  verbal: { label: "Agressão verbal", color: colors.yellow },
  fisica: { label: "Violência física", color: colors.coral },
  ameaca: { label: "Ameaça", color: colors.orange },
  discriminacao: { label: "Discriminação", color: colors.turquoise },
  vandalismo: { label: "Vandalismo", color: colors.lilac },
} as const;
export type OccurrenceType = keyof typeof OCCURRENCE_TYPES;

export const SEVERITIES = {
  baixa: { label: "Baixa", color: colors.yellow },
  media: { label: "Média", color: colors.orange },
  alta: { label: "Alta", color: colors.coral },
} as const;
export type Severity = keyof typeof SEVERITIES;

export const SUPPORT_CATEGORIES = {
  acolhimento: { label: "Acolhimento", color: colors.turquoise },
  dica: { label: "Dica de segurança", color: colors.yellow },
  pedido_ajuda: { label: "Pedido de ajuda", color: colors.coral },
} as const;
export type SupportCategory = keyof typeof SUPPORT_CATEGORIES;

export const PLACE_CATEGORIES = {
  bar: "Bar",
  restaurante: "Restaurante",
  balada: "Balada",
  cafe: "Café",
  hotel: "Hotel",
  servico: "Serviço",
  praca: "Praça",
  outro: "Outro",
} as const;
export type PlaceCategory = keyof typeof PLACE_CATEGORIES;

/** Cor da estrela de um lugar pela faixa de score. */
export function placeScoreColor(score: number): string {
  if (score >= 4.5) return colors.turquoise;
  if (score >= 3.5) return colors.yellow;
  if (score >= 2.5) return colors.orange;
  return colors.coral;
}

/** Nível de risco de uma área: score = relatos + 3 × relatos de gravidade alta. */
export function riskLevel(score: number): { label: string; color: string } {
  if (score >= 12) return { label: "Risco alto", color: colors.coral };
  if (score >= 6) return { label: "Risco médio", color: colors.orange };
  return { label: "Risco baixo", color: colors.yellow };
}

export const EMERGENCY_CONTACTS = [
  { number: "190", name: "Polícia", note: "Risco imediato" },
  { number: "192", name: "SAMU", note: "Emergência médica" },
  { number: "100", name: "Disque Direitos Humanos", note: "Denúncia de LGBTIfobia" },
  { number: "188", name: "CVV", note: "Apoio emocional 24h" },
] as const;
