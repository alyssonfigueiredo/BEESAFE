// Dados do protótipo "Irise, personagem" (prévia, 06/10/2026 — ver docs/design/irise/README.md).
// Nomes, classes, bios e atributos são provisórios. Nada daqui grava no banco ainda.

export type Forma = 0 | 1 | 2; // a | o | e

export const STATS = [
  { key: "acolhimento", label: "Acolhimento", color: "#FF6964" },
  { key: "humor", label: "Humor", color: "#FFD066" },
  { key: "papoReto", label: "Papo reto", color: "#49DCC0" },
  { key: "role", label: "Rolê", color: "#A889FF" },
] as const;

export type Irise = {
  n: number;
  nome: string;
  pronomes: string;
  classe: string;
  bio: string;
  stats: [number, number, number, number];
};

export const IRISES: Irise[] = [
  { n: 1, nome: "Theo", pronomes: "ele/dele", classe: "Guardião", bio: "Papo reto e ombro firme. Avisa antes de você chegar num lugar furado.", stats: [4, 3, 5, 3] },
  { n: 2, nome: "Luna", pronomes: "ela/dela", classe: "Conselheira", bio: "Escuta sem julgar e sempre sabe de um café tranquilo por perto.", stats: [5, 3, 3, 3] },
  { n: 3, nome: "Caio", pronomes: "ele/dele", classe: "Animador", bio: "Energia lá em cima. Comemora cada avaliação como se fosse gol.", stats: [3, 5, 3, 4] },
  { n: 4, nome: "Kai", pronomes: "elu/delu", classe: "DJ do Rolê", bio: "Conhece toda balada acolhedora da cidade e a playlist de cada uma.", stats: [3, 4, 3, 5] },
  { n: 5, nome: "Dandara", pronomes: "ela/dela", classe: "Matriarca", bio: "Mãe do grupo. Cuida, cobra água e pergunta se você chegou bem.", stats: [5, 4, 4, 3] },
  { n: 6, nome: "Rafa", pronomes: "ele/dele", classe: "Cartógrafo", bio: "Nerd do mapa. Sabe a nota de cada bairro e explica sem pressa.", stats: [4, 3, 4, 3] },
  { n: 7, nome: "Nina", pronomes: "ela/elu", classe: "Exploradora", bio: "Vive achando lugar novo. Te chama pra ser a primeira cor do mapa.", stats: [3, 4, 4, 5] },
];

export const PRONOMES = ["ela/dela", "ele/dele", "elu/delu", "qualquer pronome", "outro"] as const;
export const FORMA_PADRAO_POR_PRONOME: Forma[] = [0, 1, 2, 2, 2];
export const FORMAS = ["a", "o", "e"] as const;

/** Troca `{a|o|e}` pela forma escolhida (ex.: "bem-vind{a|o|e}" -> "bem-vinda"). */
export function flexionar(texto: string, forma: Forma): string {
  return texto.replace(/\{([^{}|]+)\|([^{}|]+)\|([^{}|]+)\}/g, (_, a, o, e) => [a, o, e][forma]);
}

export const FALAS_APRESENTACAO = [
  { texto: "Oi, {nome}! Eu sou {irise}, seu irise. Prazer!", pose: 2 },
  { texto: "Vou junto com você pelo app inteiro: nos lugares, no mapa e quando precisar de apoio.", pose: 13 },
  { texto: "Cada lugar que você avalia acende um gomo da nossa íris e a gente sobe de nível. Bora?", pose: 6 },
] as const;

// Corpo inteiro (fundo transparente): usado na Escolha (pose 1) e na Apresentação (poses 2, 6, 13).
// O Metro só resolve require() com caminho estático — por isso o mapa explícito, não um template.
const CORPO: Record<number, Record<number, number>> = {
  1: {
    1: require("../../assets/irise-personagens/p1-1.webp"),
    2: require("../../assets/irise-personagens/p1-2.webp"),
    3: require("../../assets/irise-personagens/p1-3.webp"),
    4: require("../../assets/irise-personagens/p1-4.webp"),
    5: require("../../assets/irise-personagens/p1-5.webp"),
    6: require("../../assets/irise-personagens/p1-6.webp"),
    7: require("../../assets/irise-personagens/p1-7.webp"),
  },
  2: {
    1: require("../../assets/irise-personagens/p2-1.webp"),
    2: require("../../assets/irise-personagens/p2-2.webp"),
    3: require("../../assets/irise-personagens/p2-3.webp"),
    4: require("../../assets/irise-personagens/p2-4.webp"),
    5: require("../../assets/irise-personagens/p2-5.webp"),
    6: require("../../assets/irise-personagens/p2-6.webp"),
    7: require("../../assets/irise-personagens/p2-7.webp"),
  },
  6: {
    1: require("../../assets/irise-personagens/p6-1.webp"),
    2: require("../../assets/irise-personagens/p6-2.webp"),
    3: require("../../assets/irise-personagens/p6-3.webp"),
    4: require("../../assets/irise-personagens/p6-4.webp"),
    5: require("../../assets/irise-personagens/p6-5.webp"),
    6: require("../../assets/irise-personagens/p6-6.webp"),
    7: require("../../assets/irise-personagens/p6-7.webp"),
  },
  13: {
    1: require("../../assets/irise-personagens/p13-1.webp"),
    2: require("../../assets/irise-personagens/p13-2.webp"),
    3: require("../../assets/irise-personagens/p13-3.webp"),
    4: require("../../assets/irise-personagens/p13-4.webp"),
    5: require("../../assets/irise-personagens/p13-5.webp"),
    6: require("../../assets/irise-personagens/p13-6.webp"),
    7: require("../../assets/irise-personagens/p13-7.webp"),
  },
};

export function corpoSrc(pose: number, personagem: number): number {
  return CORPO[pose]?.[personagem] ?? CORPO[1][personagem];
}
