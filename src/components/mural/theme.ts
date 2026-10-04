import type { SupportCategory } from "@/theme/domain";
import { colors } from "@/theme/tokens";

// Cor de papel de cada categoria do mural (protótipo v2 aprovado em 04/10/2026): o recado é um
// bilhete colado, não um cartão de sistema. `ink` é a tinta do rótulo e do botão ativo.
export const NOTE_TINT: Record<
  SupportCategory,
  { paper: string; ink: string; short: string; quick: string }
> = {
  acolhimento: {
    paper: "#D6F6EF",
    ink: colors.turquoiseInk,
    short: "Abraço",
    quick: "Mandar um abraço",
  },
  dica: { paper: "#FFF1CC", ink: "#8F6300", short: "Dica", quick: "Dar uma dica" },
  pedido_ajuda: {
    paper: "#FFE1DF",
    ink: colors.coralInk,
    short: "Pedido de ajuda",
    quick: "Pedir ajuda",
  },
};

export const CATEGORY_ORDER: SupportCategory[] = ["acolhimento", "dica", "pedido_ajuda"];

/** Frases para começar, por categoria. Tocar preenche o campo. */
export const SUGGESTIONS: Record<SupportCategory, string[]> = {
  acolhimento: ["Você não está só.", "Vai no seu tempo.", "Um lugar que me acolheu foi…"],
  dica: ["Evitem…", "Um lugar seguro pra ir é…", "Pra quem precisa de…"],
  pedido_ajuda: ["Alguém conhece…", "Preciso de ajuda com…", "Onde encontro…"],
};

/**
 * Texto que descreve uma violência sofrida: no mural ele fica com apelido; como relato fica
 * anônimo e vira aviso no mapa. A folha oferece a troca, sem impedir de publicar.
 */
export const PARECE_RELATO =
  /(me agrediram|fui agredid|me bateram|apanhei|me xingaram|fui xingad|me ameaç|ameaçaram|me expulsaram|assedi|me seguiram)/i;

/** "agora", "há 5 min", "há 2 h", "ontem", "há 3 dias", "12/09". */
export function tempoCurto(iso: string, now = Date.now()) {
  const t = new Date(iso).getTime();
  const min = Math.max(0, Math.round((now - t) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  const dt = new Date(t);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
}
