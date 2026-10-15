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
  ativo: boolean;
};

/** Os 9 personagens com fotos embutidas no app (offline, sem rede). Qualquer outro número vem do
 * banco (`irise_personagens`, migration 71) e as fotos vêm do Storage — ver `useIrisePersonagens`. */
export const BUNDLED_N = new Set([10, 11, 12, 13, 14, 15, 16, 17, 18]);

/** Quando a foto EMBUTIDA de cada personagem mudou pela última vez (data do commit que trocou
 * `assets/irise-personagens/*-<n>.webp` / `avatar-card-*-<n>.png`). `useBustoResolvido` compara
 * com `foto_atualizada_em` do banco (gravado quando alguém troca a foto pelo painel) e usa quem
 * for mais recente — sem isso, uma foto trocada pelo painel ficava valendo pra sempre, mesmo
 * depois de o repositório trazer uma embutida nova e melhor (foi o caso do Ali em 15/10/2026).
 * Atualizar a data aqui sempre que recompuser as fotos embutidas de um personagem (ex.:
 * `scripts/irise-poses-refazer.py`), senão a embutida nova perde pra uma foto antiga do painel. */
export const EMBUTIDA_ATUALIZADA_EM: Record<number, string> = {
  10: "2026-10-14T01:51:43Z",
  11: "2026-10-14T01:51:43Z",
  12: "2026-10-15T01:43:22Z",
  13: "2026-10-14T01:51:43Z",
  14: "2026-10-14T01:51:43Z",
  15: "2026-10-14T01:51:43Z",
  16: "2026-10-14T01:51:43Z",
  17: "2026-10-14T01:51:43Z",
  18: "2026-10-14T01:51:43Z",
};

export const IRISES: Irise[] = [
  { n: 10, nome: "Kai", pronomes: "elu/delu", classe: "DJ do Rolê", bio: "Conhece toda balada acolhedora da cidade e a playlist de cada uma.", stats: [3, 4, 3, 5], ativo: true },
  { n: 11, nome: "Léo", pronomes: "ele/dele", classe: "Guardião", bio: "Papo reto e ombro firme. Avisa antes de você chegar num lugar furado.", stats: [4, 3, 5, 3], ativo: true },
  { n: 12, nome: "Ali", pronomes: "ele/dele", classe: "Conselheiro", bio: "Escuta sem julgar e sempre sabe de algum lugar por perto que vai te garantir boas risadas.", stats: [5, 3, 3, 3], ativo: true },
  { n: 13, nome: "Bento", pronomes: "ele/dele", classe: "Anfitrião", bio: "Faz questão de te apresentar todo mundo. Sabe o nome de metade da cidade.", stats: [5, 4, 3, 4], ativo: true },
  { n: 14, nome: "Dante", pronomes: "ele/dele", classe: "Protetor", bio: "Grandão, de voz mansa. Te acompanha até a porta sem fazer drama.", stats: [4, 3, 4, 3], ativo: true },
  { n: 15, nome: "Rafa", pronomes: "ele/dele", classe: "Cartógrafo", bio: "Nerd do mapa. Sabe a nota de cada bairro e explica sem pressa.", stats: [4, 3, 4, 3], ativo: true },
  { n: 16, nome: "Yara", pronomes: "ela/dela", classe: "Exploradora", bio: "Vive achando lugar novo. Te chama pra ser a primeira cor do mapa.", stats: [3, 4, 4, 5], ativo: true },
  { n: 17, nome: "Dandara", pronomes: "ela/dela", classe: "Matriarca", bio: "Mãe do grupo. Cuida, cobra água e pergunta se você chegou bem.", stats: [5, 4, 4, 3], ativo: true },
  { n: 18, nome: "Luna", pronomes: "ela/dela", classe: "Confidente", bio: "Escuta antes de opinar. Sempre acha uma frase que acalma.", stats: [5, 3, 4, 3], ativo: true },
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
  { texto: "Oi, {nome}! Eu sou {irise}, seu irise. Prazer!", pose: 1 },
  { texto: "Fico te esperando no chat, sempre que quiser uma sugestão ou só conversar.", pose: 1 },
  { texto: "Quer trocar de irise ou de pronome depois? É só ir no seu perfil. Bora?", pose: 1 },
] as const;

// Corpo inteiro (fundo transparente): só a pose 1 por personagem (fotos reais, 09/10/2026 — sem
// variação de pose de corpo inteiro, só de busto, ver BUSTO abaixo).
// O Metro só resolve require() com caminho estático — por isso o mapa explícito, não um template.
const CORPO: Record<number, Record<number, number>> = {
  1: {
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

// Personagem criado pelo admin (fora dos 9 originais) ainda não tem foto de corpo inteiro — só
// busto (ver LEIA do pacote de imagens). Até existir essa peça, a apresentação usa o corpo do Kai
// no lugar: mostra o rosto errado por alguns segundos, mas não quebra a tela.
export function corpoSrc(pose: number, personagem: number): number {
  return CORPO[pose]?.[personagem] ?? CORPO[1][personagem] ?? CORPO[1][10];
}

// Busto (300×460): feito sob medida pro avatar circular — nunca usar o corpo inteiro (acima) num
// círculo, a imagem não é recortada pra isso e corta torto.
// Poses de busto (fotos reais, 09/10/2026): 1 mão no peito (padrão), 2 comemorando, 3 preocupado,
// 4 acolhendo, 5 piscadinha, 6 apoio — cada uma usada num lugar diferente do app (ver onde cada
// bustoSrc(pose, …) é chamado).
export const BUSTO_ASPECTO = 460 / 300;
const BUSTO: Record<number, Record<number, number>> = {
  1: {
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
  2: {
    10: require("../../assets/irise-personagens/b2-10.webp"),
    11: require("../../assets/irise-personagens/b2-11.webp"),
    12: require("../../assets/irise-personagens/b2-12.webp"),
    13: require("../../assets/irise-personagens/b2-13.webp"),
    14: require("../../assets/irise-personagens/b2-14.webp"),
    15: require("../../assets/irise-personagens/b2-15.webp"),
    16: require("../../assets/irise-personagens/b2-16.webp"),
    17: require("../../assets/irise-personagens/b2-17.webp"),
    18: require("../../assets/irise-personagens/b2-18.webp"),
  },
  3: {
    10: require("../../assets/irise-personagens/b3-10.webp"),
    11: require("../../assets/irise-personagens/b3-11.webp"),
    12: require("../../assets/irise-personagens/b3-12.webp"),
    13: require("../../assets/irise-personagens/b3-13.webp"),
    14: require("../../assets/irise-personagens/b3-14.webp"),
    15: require("../../assets/irise-personagens/b3-15.webp"),
    16: require("../../assets/irise-personagens/b3-16.webp"),
    17: require("../../assets/irise-personagens/b3-17.webp"),
    18: require("../../assets/irise-personagens/b3-18.webp"),
  },
  4: {
    10: require("../../assets/irise-personagens/b4-10.webp"),
    11: require("../../assets/irise-personagens/b4-11.webp"),
    12: require("../../assets/irise-personagens/b4-12.webp"),
    13: require("../../assets/irise-personagens/b4-13.webp"),
    14: require("../../assets/irise-personagens/b4-14.webp"),
    15: require("../../assets/irise-personagens/b4-15.webp"),
    16: require("../../assets/irise-personagens/b4-16.webp"),
    17: require("../../assets/irise-personagens/b4-17.webp"),
    18: require("../../assets/irise-personagens/b4-18.webp"),
  },
  5: {
    10: require("../../assets/irise-personagens/b5-10.webp"),
    11: require("../../assets/irise-personagens/b5-11.webp"),
    12: require("../../assets/irise-personagens/b5-12.webp"),
    13: require("../../assets/irise-personagens/b5-13.webp"),
    14: require("../../assets/irise-personagens/b5-14.webp"),
    15: require("../../assets/irise-personagens/b5-15.webp"),
    16: require("../../assets/irise-personagens/b5-16.webp"),
    17: require("../../assets/irise-personagens/b5-17.webp"),
    18: require("../../assets/irise-personagens/b5-18.webp"),
  },
  6: {
    10: require("../../assets/irise-personagens/b6-10.webp"),
    11: require("../../assets/irise-personagens/b6-11.webp"),
    12: require("../../assets/irise-personagens/b6-12.webp"),
    13: require("../../assets/irise-personagens/b6-13.webp"),
    14: require("../../assets/irise-personagens/b6-14.webp"),
    15: require("../../assets/irise-personagens/b6-15.webp"),
    16: require("../../assets/irise-personagens/b6-16.webp"),
    17: require("../../assets/irise-personagens/b6-17.webp"),
    18: require("../../assets/irise-personagens/b6-18.webp"),
  },
};

export function bustoSrc(pose: number, personagem: number): number {
  return BUSTO[pose]?.[personagem] ?? BUSTO[1][personagem];
}
