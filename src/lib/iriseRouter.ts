import type { PlaceCategory } from "@/theme/domain";

/**
 * Irise, camada 1: palavras-chave resolvidas no aparelho, sem gastar IA nenhuma. Só o que o
 * roteador não reconhece desce para a camada 2 (Edge Function irise-intent, Groq/Gemini).
 */
export type IriseIntent = {
  categories: PlaceCategory[] | null;
  semNota: boolean;
  perto: boolean;
  mensagem: string;
};

type Regra = { rx: RegExp; intent: Omit<IriseIntent, "perto"> & { perto?: boolean } };

const REGRAS: Regra[] = [
  {
    rx: /\bbarat|em conta|economic/i,
    intent: { categories: null, semNota: false, mensagem: 'Peguei a vibe (reconheci "barato" sem IA):' },
  },
  {
    rx: /\bbalad|fervo|dançar/i,
    intent: { categories: ["balada"], semNota: false, mensagem: "Ah. Finalmente uma pergunta séria." },
  },
  {
    rx: /\bcaf[eé]\b/i,
    intent: { categories: ["cafe"], semNota: false, mensagem: "Separei esses cafés pra você:" },
  },
  {
    rx: /\bbar\b|\bbeber\b|\bcerveja\b/i,
    intent: { categories: ["bar"], semNota: false, mensagem: "Esses bares têm boa fama por aqui:" },
  },
  {
    rx: /\bcomer\b|restaurante|almo[çc]|jantar/i,
    intent: { categories: ["restaurante"], semNota: false, mensagem: "Pra comer, esses:" },
  },
  {
    rx: /\bhotel|pousada|hospedagem/i,
    intent: { categories: ["hotel"], semNota: false, mensagem: "Pra ficar, esses:" },
  },
  {
    rx: /surpreend/i,
    intent: { categories: null, semNota: false, mensagem: "Ah, deixa comigo então." },
  },
  {
    rx: /irisar|sem nota|ningu[eé]m avaliou|descobrir/i,
    intent: {
      categories: null,
      semNota: true,
      mensagem: "Esses aqui a comunidade quase não irisou ainda — topa ser quem conta como é?",
    },
  },
];

const PERTO_RX = /\bperto\b|\bpr[oó]xim|\bna esquina\b|\bagora\b.*\bperto\b/i;

/** Tenta resolver o texto sem IA. `null` = ninguém casou, desce pra camada 2. */
export function routeIrise(texto: string): IriseIntent | null {
  const t = texto.trim();
  if (!t) return null;
  if (PERTO_RX.test(t)) {
    return { categories: null, semNota: false, perto: true, mensagem: "Pelo que vejo daqui, perto de você:" };
  }
  for (const regra of REGRAS) {
    if (regra.rx.test(t)) return { ...regra.intent, perto: regra.intent.perto ?? false };
  }
  return null;
}
