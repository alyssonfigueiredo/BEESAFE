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
  { n: 8, nome: "Bruno", pronomes: "ele/dele", classe: "Treinador", bio: "Te empurra pra fora de casa com carinho. Comemora junto cada avaliação nova.", stats: [4, 4, 3, 4] },
  { n: 9, nome: "Igor", pronomes: "ele/dele", classe: "Viajante", bio: "Sempre de mochila nas costas, já mapeou meio bairro sem ninguém pedir.", stats: [3, 3, 4, 5] },
  { n: 10, nome: "Kai", pronomes: "elu/delu", classe: "DJ do Rolê", bio: "Conhece toda balada acolhedora da cidade e a playlist de cada uma.", stats: [3, 4, 3, 5] },
  { n: 11, nome: "Léo", pronomes: "ele/dele", classe: "Guardião", bio: "Papo reto e ombro firme. Avisa antes de você chegar num lugar furado.", stats: [4, 3, 5, 3] },
  { n: 12, nome: "Theo", pronomes: "ele/dele", classe: "Conselheiro", bio: "Escuta sem julgar e sempre sabe de um café tranquilo por perto.", stats: [5, 3, 3, 3] },
  { n: 13, nome: "Bento", pronomes: "ele/dele", classe: "Anfitrião", bio: "Faz questão de te apresentar todo mundo. Sabe o nome de metade da cidade.", stats: [5, 4, 3, 4] },
  { n: 14, nome: "Dante", pronomes: "ele/dele", classe: "Protetor", bio: "Grandão, de voz mansa. Te acompanha até a porta sem fazer drama.", stats: [4, 3, 4, 3] },
  { n: 15, nome: "Rafa", pronomes: "ele/dele", classe: "Cartógrafo", bio: "Nerd do mapa. Sabe a nota de cada bairro e explica sem pressa.", stats: [4, 3, 4, 3] },
  { n: 16, nome: "Yara", pronomes: "ela/dela", classe: "Exploradora", bio: "Vive achando lugar novo. Te chama pra ser a primeira cor do mapa.", stats: [3, 4, 4, 5] },
  { n: 17, nome: "Dandara", pronomes: "ela/dela", classe: "Matriarca", bio: "Mãe do grupo. Cuida, cobra água e pergunta se você chegou bem.", stats: [5, 4, 4, 3] },
  { n: 18, nome: "Luna", pronomes: "ela/dela", classe: "Confidente", bio: "Escuta antes de opinar. Sempre acha uma frase que acalma.", stats: [5, 3, 4, 3] },
];

export const PRONOMES = ["ela/dela", "ele/dele", "elu/delu", "qualquer pronome", "outro"] as const;
export const FORMA_PADRAO_POR_PRONOME: Forma[] = [0, 1, 2, 2, 2];
export const FORMAS = ["a", "o", "e"] as const;

/** Troca `{a|o|e}` pela forma escolhida (ex.: "bem-vind{a|o|e}" -> "bem-vinda"). */
export function flexionar(texto: string, forma: Forma): string {
  return texto.replace(/\{([^{}|]+)\|([^{}|]+)\|([^{}|]+)\}/g, (_, a, o, e) => [a, o, e][forma]);
}

// Sem XP/nível (decisão do Alysson, 06/10/2026) e só no chat (não acompanha o app inteiro).
export const FALAS_APRESENTACAO = [
  { texto: "Oi, {nome}! Eu sou {irise}, seu irise. Prazer!", pose: 2 },
  { texto: "Fico te esperando ali no chat, sempre que quiser uma sugestão ou só conversar.", pose: 13 },
  { texto: "Quer trocar de irise ou de pronome depois? É só ir no seu perfil. Bora?", pose: 6 },
] as const;

// Corpo inteiro (fundo transparente): usado na Escolha (pose 1) e na Apresentação (poses 2, 6, 13).
// O Metro só resolve require() com caminho estático — por isso o mapa explícito, não um template.
const CORPO: Record<number, Record<number, number>> = {
  1: {
    8: require("../../assets/irise-personagens/p1-8.webp"),
    9: require("../../assets/irise-personagens/p1-9.webp"),
    10: require("../../assets/irise-personagens/p1-10.webp"),
    11: require("../../assets/irise-personagens/p1-11.webp"),
    12: require("../../assets/irise-personagens/p1-12.webp"),
    13: require("../../assets/irise-personagens/p1-13.webp"),
    14: require("../../assets/irise-personagens/p1-14.webp"),
    15: require("../../assets/irise-personagens/p1-15.webp"),
    16: require("../../assets/irise-personagens/p1-16.webp"),
    17: require("../../assets/irise-personagens/p1-17.webp"),
    18: require("../../assets/irise-personagens/p1-18.webp"),
  },
};

export function corpoSrc(pose: number, personagem: number): number {
  return CORPO[pose]?.[personagem] ?? CORPO[1][personagem];
}

// Busto (300×460, mesma proporção pros 7): feito sob medida pro avatar circular — nunca usar o
// corpo inteiro (acima) num círculo, a imagem não é recortada pra isso e corta torto.
export const BUSTO_ASPECTO = 460 / 300;
const BUSTO: Record<number, Record<number, number>> = {
  1: {
    8: require("../../assets/irise-personagens/b1-8.webp"),
    9: require("../../assets/irise-personagens/b1-9.webp"),
    10: require("../../assets/irise-personagens/b1-10.webp"),
    11: require("../../assets/irise-personagens/b1-11.webp"),
    12: require("../../assets/irise-personagens/b1-12.webp"),
    13: require("../../assets/irise-personagens/b1-13.webp"),
    14: require("../../assets/irise-personagens/b1-14.webp"),
    15: require("../../assets/irise-personagens/b1-15.webp"),
    16: require("../../assets/irise-personagens/b1-16.webp"),
    17: require("../../assets/irise-personagens/b1-17.webp"),
    18: require("../../assets/irise-personagens/b1-18.webp"),
  },
};

export function bustoSrc(pose: number, personagem: number): number {
  return BUSTO[pose]?.[personagem] ?? BUSTO[1][personagem];
}
