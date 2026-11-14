import { flexionar, type Forma } from "@/lib/irisePersonagens";
import { getMedalha } from "@/lib/medals";
import { faseTrans } from "@/lib/semanaTrans";
import type { Gamificacao } from "@/hooks/useGamification";
import { quaseLa } from "@/hooks/useGamification";

/** O que acontece depois que a resposta rápida aparece: `onAcao` do `IriseSheet` navega pra lá
 * (exceto "sugerir", que busca lugares sem sair do chat). Nem toda resposta tem uma — "Como
 * funciona?" e "Outros" só respondem com texto mesmo. */
export type Acao = "lugares" | "mapa" | "avaliar" | "apoio" | "conquistas" | "sugerir";

export type Fala = {
  id: "missao" | "falta" | "sugestao" | "alerta" | "conquista" | "semana";
  tag: string;
  cor: string;
  texto: string;
  pose: number;
  cta: string;
  abertura: string;
  rapidas: { t: string; resposta: string; pose: number; acao?: Acao }[];
};

// Ordem da rodada. A última (conquista) é onde o balão para. Textos aqui são o padrão/reserva —
// `falasDoIrise` troca "falta" e "conquista" por um dado real quando `gami` existe.
export const FALAS: Fala[] = [
  {
    id: "missao",
    tag: "MISSÃO DO DIA",
    cor: "#0A8B7A",
    // Sem número fixo: avaliar 1 lugar vale 1 gomo (não 3), e só se a semana ainda não bateu o
    // teto de 4 — prometer "+3 gomos" sempre seria mentira na maioria das vezes.
    texto: "Colore 1 lugar hoje.",
    pose: 4,
    cta: "Avaliar",
    abertura: "Bora colorir 1 lugar hoje? Quer que eu sugira um perto de você?",
    rapidas: [
      // Nunca cita lugar nenhum — o irise não pode inventar endereço.
      { t: "Sugere um", resposta: "Deixa comigo, já procuro.", pose: 5, acao: "sugerir" },
      { t: "Hoje não", resposta: "Tranquilo! A missão fica aqui até meia-noite.", pose: 1 },
    ],
  },
  {
    id: "falta",
    tag: "FALTA POUCO",
    cor: "#B85C00",
    texto: "Falta pouco pra próxima figurinha!",
    pose: 1,
    cta: "Ver figurinha",
    abertura: "Você tá perto da próxima figurinha. Quer ver o que falta?",
    rapidas: [
      { t: "Avaliar agora", resposta: "Bora! Escolhe o lugar.", pose: 4, acao: "avaliar" },
      {
        t: "Como funciona?",
        resposta: "Cada semana acesa conta. Com 4 semanas seguidas, a figurinha é tua.",
        pose: 1,
      },
    ],
  },
  {
    id: "sugestao",
    tag: "SUGESTÃO",
    cor: "#6037F0",
    texto: "Te mostro 3 lugares acolhedores?",
    pose: 5,
    cta: "Ver lugares",
    abertura: "Separei 3 lugares acolhedores perto de você:",
    rapidas: [
      { t: "Ver no mapa", resposta: "Abrindo o mapa com os três marcados.", pose: 4, acao: "mapa" },
      { t: "Outros", resposta: "Quer algo mais tranquilo, tipo café, ou balada?", pose: 1 },
    ],
  },
  {
    id: "alerta",
    tag: "ALERTA",
    cor: "#C72825",
    // "{local}" vira "do {bairro}" ou, sem bairro, "de você" — nunca "hoje à noite" (a hora real do
    // relato pode ser outra).
    texto: "Relato recente perto {local}.",
    pose: 3,
    cta: "Ver no mapa",
    abertura:
      "Teve um relato novo perto {local} nas últimas 24 horas. Se for sair, quer ver lugares mais tranquilos?",
    rapidas: [
      {
        t: "Mostra no mapa",
        resposta: "Abrindo o mapa com o ponto do relato e os lugares bem avaliados em volta.",
        pose: 4,
        acao: "mapa",
      },
      {
        t: "Preciso de apoio",
        resposta: "Tô aqui com você. Quer falar com alguém agora ou ver os serviços de acolhimento?",
        pose: 6,
        acao: "apoio",
      },
    ],
  },
  {
    id: "conquista",
    tag: "CONQUISTA",
    cor: "#9C6C00",
    texto: "Semana acesa!",
    pose: 2,
    cta: "Ver os dias",
    abertura: "Semana acesa! Tô orgulhose!",
    rapidas: [
      { t: "Ver os dias", resposta: "Te mostro.", pose: 4, acao: "conquistas" },
      { t: "Valeu, Ali!", resposta: "Eu que agradeço. Teu mapa tá ficando lindo.", pose: 2 },
    ],
  },
];

// Rafa (15) e Luna (18): os irises trans dos nove originais.
const IRISES_TRANS = [15, 18];

export function formaDoPronome(pronomes: string): Forma {
  if (pronomes.startsWith("ela")) return 0;
  if (pronomes.startsWith("ele")) return 1;
  return 2;
}

/**
 * `FALAS` com o nome e o gênero certos do irise escolhido (nunca o pronome da pessoa, que é outra
 * coisa) e, quando `gami` existe, com dado real no lugar de texto fixo: a figurinha mais perto
 * ("falta") e a conquista do momento ("conquista" — semana acesa ou medalha nova). Não muda `FALAS`.
 */
export function falasDoIrise(
  irise: { n?: number; nome: string; pronomes: string } | null,
  gami?: Gamificacao | null,
): Fala[] {
  const semanaTrans = faseTrans() === "semana";
  const formaIrise = irise ? formaDoPronome(irise.pronomes) : 2;
  const nomeIrise = irise?.nome ?? "seu irise";
  const quase = quaseLa(gami);
  const nomeFigurinha = quase ? getMedalha(quase.id)?.t : undefined;
  const medalhaNova = gami?.conquistadas.find((c) => !c.visto);
  const nomeMedalhaNova = medalhaNova ? getMedalha(medalhaNova.id)?.t : undefined;

  const falas = FALAS.map((f): Fala => {
    // Semana da Visibilidade Trans (13–19/11/2026): a missão do dia vira a fala da semana, com o
    // mesmo destino. Todo irise fala; Rafa e Luna, em primeira pessoa. Ela vai para o fim da
    // rodada (onde o balão para) e aparece a semana toda, mesmo com avaliação feita hoje.
    // O balão tem uma linha só: texto com até ~36 letras. Sai sozinho depois de 19/11.
    if (f.id === "missao" && semanaTrans) {
      const nossa = !!irise?.n && IRISES_TRANS.includes(irise.n);
      return {
        ...f,
        id: "semana",
        tag: "SEMANA TRANS",
        cor: "#A63A63",
        texto: nossa ? "Semana nossa. Avaliou um banheiro?" : "Avaliou o banheiro de algum lugar?",
        abertura: nossa
          ? "Essa semana é nossa: Visibilidade Trans. Avaliou o banheiro de algum lugar? Muita gente lê isso antes de sair de casa."
          : "É a Semana da Visibilidade Trans. Avaliou o banheiro de algum lugar? Ajuda muita gente a escolher onde ir.",
        rapidas: [
          f.rapidas[0],
          {
            t: "Por que o banheiro?",
            resposta:
              "É a resposta que pessoas trans mais procuram antes de sair. Se não usou o banheiro, pode pular essa pergunta.",
            pose: 1,
          },
        ],
      };
    }
    if (f.id === "falta") {
      if (!nomeFigurinha) return f;
      return {
        ...f,
        texto: `Falta pouco pra figurinha ${nomeFigurinha}!`,
        abertura: `Você tá perto da figurinha ${nomeFigurinha}. Quer ver o que falta?`,
      };
    }
    if (f.id === "conquista") {
      const orgulho = flexionar("Tô orgulhos{a|o|e}!", formaIrise);
      let texto = f.texto;
      let abertura = f.abertura;
      if (gami?.semana.acesa) {
        texto = "Semana acesa!";
        abertura = `Semana acesa! ${orgulho}`;
      } else if (nomeMedalhaNova) {
        texto = `Figurinha nova: ${nomeMedalhaNova}!`;
        abertura = `Você ganhou a figurinha ${nomeMedalhaNova}! ${orgulho}`;
      }
      return {
        ...f,
        texto,
        abertura,
        rapidas: f.rapidas.map((r) => (r.t === "Valeu, Ali!" ? { ...r, t: `Valeu, ${nomeIrise}!` } : r)),
      };
    }
    return f;
  });
  // A fala da semana por último: é nela que o balão para.
  return [...falas.filter((f) => f.id !== "semana"), ...falas.filter((f) => f.id === "semana")];
}
