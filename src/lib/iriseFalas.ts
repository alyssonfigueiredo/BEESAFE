export type Fala = {
  id: "missao" | "falta" | "sugestao" | "alerta" | "conquista";
  tag: string;
  cor: string;
  texto: string;
  pose: number;
  cta: string;
  abertura: string;
  rapidas: { t: string; resposta: string; pose: number }[];
};

// Ordem da rodada. A última (conquista) é onde o balão para.
export const FALAS: Fala[] = [
  {
    id: "missao",
    tag: "MISSÃO DO DIA",
    cor: "#0A8B7A",
    texto: "Colore 1 lugar hoje: +3 gomos.",
    pose: 4,
    cta: "Avaliar",
    abertura: "Bora colorir 1 lugar hoje? Vale +3 gomos. Quer que eu sugira um perto de você?",
    rapidas: [
      { t: "Sugere um", resposta: "O James Bar tá a 600 m e ainda tem poucas avaliações. Tua cor ia fazer diferença lá.", pose: 5 },
      { t: "Hoje não", resposta: "Tranquilo! A missão fica aqui até meia-noite.", pose: 1 },
    ],
  },
  {
    id: "falta",
    tag: "FALTA POUCO",
    cor: "#B85C00",
    texto: "Falta 1 semana pra figurinha!",
    pose: 1,
    cta: "Ver figurinha",
    abertura: "Falta 1 semana pra figurinha Conhecida. É só avaliar pelo menos 1 lugar por dia até domingo.",
    rapidas: [
      { t: "Avaliar agora", resposta: "Boa! Te levo pra avaliação.", pose: 4 },
      { t: "Como funciona?", resposta: "Cada semana acesa conta. Com 4 semanas seguidas, a figurinha é tua.", pose: 1 },
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
      { t: "Ver no mapa", resposta: "Abrindo o mapa com os três marcados.", pose: 4 },
      { t: "Outros", resposta: "Quer algo mais tranquilo, tipo café, ou balada?", pose: 1 },
    ],
  },
  {
    id: "alerta",
    tag: "ALERTA",
    cor: "#C72825",
    texto: "Teve relato perto do Centro hoje.",
    pose: 3,
    cta: "Ver no mapa",
    abertura: "Teve um relato novo perto do Centro hoje à noite. Se for sair, quer que eu te mostre caminhos e lugares mais tranquilos?",
    rapidas: [
      { t: "Mostra no mapa", resposta: "Abrindo o mapa com o ponto do relato e os lugares bem avaliados em volta.", pose: 4 },
      { t: "Preciso de apoio", resposta: "Tô aqui com você. Quer falar com alguém agora ou ver os serviços de acolhimento?", pose: 6 },
    ],
  },
  {
    id: "conquista",
    tag: "CONQUISTA",
    cor: "#9C6C00",
    texto: "Semana acesa! 4 de 4 dias.",
    pose: 2,
    cta: "Ver os dias",
    abertura: "Semana acesa! 4 de 4 dias. Você ganhou 2 faíscas extra. Tô orgulhoso!",
    rapidas: [
      { t: "Ver os dias", resposta: "Seg, ter, qui e sáb. Bora manter a sequência?", pose: 4 },
      { t: "Valeu, Ali!", resposta: "Eu que agradeço. Teu mapa tá ficando lindo.", pose: 2 },
    ],
  },
];
