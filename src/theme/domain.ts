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

// Onde foi e quando foi. Os dois são opcionais: quem registra acabou de passar por violência,
// e exigir classificação nesse momento é atrito no pior momento possível.
export const OCCURRENCE_SETTINGS = {
  rua: { label: "Rua ou calçada", color: colors.coral },
  praca: { label: "Praça ou parque", color: colors.turquoise },
  transporte: { label: "Transporte", color: colors.orange },
  estabelecimento: { label: "Dentro de um lugar", color: colors.lilac },
  servico: { label: "Serviço público", color: colors.yellow },
  outro: { label: "Outro", color: colors.dim },
} as const;
export type OccurrenceSetting = keyof typeof OCCURRENCE_SETTINGS;

export const DAY_PERIODS = {
  madrugada: { label: "Madrugada", hint: "0h às 6h", color: colors.lilac },
  manha: { label: "Manhã", hint: "6h às 12h", color: colors.yellow },
  tarde: { label: "Tarde", hint: "12h às 18h", color: colors.orange },
  noite: { label: "Noite", hint: "18h às 0h", color: colors.turquoise },
} as const;
export type DayPeriod = keyof typeof DAY_PERIODS;

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

// ---------- acolhimento ----------
// Quatro eixos em vez de uma nota só: o peso é maior onde o risco é maior. Os mesmos pesos
// estão em compute_place_score (migration 00000000000006) — mudou aqui, muda lá.
export const AXES = {
  welcome: {
    label: "Atendimento",
    question: "A equipe te tratou bem?",
    hint: "Sem constrangimento, sem olhar torto, sem insistir no “senhor”.",
    weight: 0.3,
  },
  affection: {
    label: "Afeto",
    question: "Dava para ficar à vontade com quem você ama?",
    hint: "De mãos dadas, um beijo, sem plateia.",
    weight: 0.3,
  },
  restroom: {
    label: "Banheiro",
    question: "E o banheiro?",
    hint: "Usou o que quis, sem ser questionade.",
    weight: 0.25,
  },
  crowd: {
    label: "Clientela",
    question: "E as outras pessoas no ambiente?",
    hint: "Quem estava em volta, não a equipe.",
    weight: 0.15,
  },
} as const;
export type Axis = keyof typeof AXES;
export const AXIS_KEYS = Object.keys(AXES) as Axis[];

// Selos: o número diz quanto, o selo diz o que fazer com isso.
export const BADGES = {
  acolhedor: {
    label: "Acolhedor",
    color: colors.turquoise,
    ink: colors.turquoiseInk,
    note: "Nota alta e consistente entre quem frequenta.",
  },
  bem: {
    label: "Bem avaliado",
    color: colors.yellow,
    ink: colors.yellowInk,
    note: "Avaliações boas, sem unanimidade.",
  },
  dividido: {
    label: "Opiniões divididas",
    color: colors.lilac,
    ink: colors.lilacInk,
    note: "As experiências variam muito — costuma depender de quem está no turno.",
  },
  atencao: {
    label: "Atenção",
    color: colors.coral,
    ink: colors.coralInk,
    note: "Relato recente no local ou avaliações ruins repetidas.",
  },
  poucas: {
    label: "Poucas avaliações",
    color: colors.subtle,
    ink: colors.muted,
    note: "Ainda não dá para dizer: são precisas 5 avaliações.",
  },
} as const;
export type Badge = keyof typeof BADGES;

export const RATING_MIN = 5; // avaliações necessárias para o lugar ganhar selo e entrar no ranking

/** Cor do número da nota pela faixa de score. */
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
