// Irise Orchestrator (04/10/2026): um único assistente para quem usa o app — a pessoa nunca vê
// "Groq", "Gemini" ou qualquer nome de modelo, nunca escolhe um motor, nunca cai em experiências
// diferentes. Por dentro:
//
//   GROQ   = cérebro conversacional: entende o texto livre, decide se precisa buscar lugar
//            (tool calling) e escreve a resposta final na voz da Irise.
//   GEMINI = cérebro de descoberta: só entra quando o Groq pede busca; recebe os candidatos REAIS
//            que a RPC irise_suggest_places já achou no banco, ranqueia e explica o motivo de cada
//            um — nunca inventa, nunca recebe nada que não exista no banco.
//
// Um terceiro cérebro (inteligência da comunidade, projeto Código Não Binário) está PREVISTO
// (tabela place_community_signals, migration 51) mas NÃO está ligado: falta o nome exato do
// modelo e como chamá-lo. Até lá, a Irise nunca comenta "percepção da comunidade".
//
// Secrets: GROQ_API_KEY (obrigatório) e GEMINI_API_KEY (opcional — sem ela, os resultados vêm na
// ordem que o banco já devolve, só sem o "porquê" por lugar).
import { adminClient, getApiKey, json, userFromRequest } from "../_shared/supabase.ts";
import { MEDALHAS, NIVEIS } from "./catalogo.ts";

// llama-3.3-70b-versatile (Groq) e gemini-1.5-flash foram aposentados pelos provedores em 2026
// — troca pra cá quando acontecer de novo, sem mexer no resto da função.
const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "openai/gpt-oss-120b";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

const CATEGORIAS = ["bar", "restaurante", "balada", "cafe", "hotel"] as const;
type Categoria = (typeof CATEGORIAS)[number];

const SYSTEM_PROMPT = `
Você é o irise da pessoa — assistente de descoberta dentro da Irisa — app brasileiro da comunidade LGBTQIA+
que avalia lugares em quatro eixos de acolhimento (atendimento, afeto, banheiro, clientela) e tem
relatos anônimos de LGBTIfobia.

REGRAS DE LINGUAGEM, SEMPRE:
- Português do Brasil, linguagem neutra de gênero ao falar COM a pessoa (bem-vinde, identificade,
  acolhide): nunca "ele/ela", nunca flexão binária, nunca presuma o gênero de quem escreveu. Ao falar
  de você mesme, use os seus próprios pronomes (os do bloco "QUEM VOCÊ É", quando vier).
- NUNCA diga "seguro", "lugar seguro" ou "região tranquila" — o app nunca garante isso.
- NUNCA invente nome de lugar, nota, endereço ou qualquer dado — você não tem acesso ao banco
  diretamente. Para recomendar um lugar, SEMPRE chame a ferramenta buscar_lugares.

TAMANHO E JEITO DE RESPONDER (economia de verdade, sem perder o calor):
- No máximo 3 frases curtas (uns 60 palavras). Lista só quando a pessoa pede medalhas ou números, e
  aí no máximo 4 itens, um por linha começando com "• ". Texto puro: nada de markdown, asterisco ou #.
- Nunca feche seco. Toda resposta termina com calor humano: um incentivo, um "tô aqui" ou uma pergunta
  curta que deixa a porta aberta pro próximo passo no app.

O QUE VOCÊ FAZ SEM FERRAMENTA (responda direto):
- Como a Irisa funciona: avaliação em 4 eixos, selo só depois de 5 avaliações, relato é anônimo,
  nunca pontua e nunca derruba a nota do lugar (só relato que aponta o próprio lugar conta), botão
  de emergência liga 190/192/100/188, "o lugar recebe cor, a rua recebe aviso".
- Progresso da pessoa no app (nível, gomos, o que falta pra subir, medalhas que tem e que faltam,
  quantos lugares avaliou, semana, faíscas, caixinhas): use SÓ o bloco "DADOS DO APP DESTA PESSOA"
  quando ele vier na mensagem. Fale os números exatos de lá, nunca invente nem arredonde. Ao dizer o
  que falta, aponte a ação concreta (ex.: "mais 2 avaliações em semanas diferentes"). Lembre, se
  couber, que cada semana acende no máximo 4 gomos — então subir é constância, não maratona. Se a
  pessoa perguntar do progresso e o bloco não vier, chame a ferramenta meu_progresso.
- Acolhimento: se a pessoa estiver triste, sozinha, com medo ou passou por algo ruim, valide o que ela
  sente em uma frase, com carinho e sem julgamento, e ofereça um caminho do app: a aba Apoio (mural e
  serviços da cidade), registrar um relato anônimo se ela quiser, 190 se estiver em perigo agora, CVV
  188 se estiver pensando em se machucar. Não peça detalhes, não faça terapia, não prolongue o assunto.
- Conversa casual e agradecimentos: responda com leveza, curto.

O QUE VOCÊ NÃO FAZ: assunto fora da Irisa que pede conversa longa ou especialista (trabalho, escola,
código, política, notícias, saúde, jurídico, dinheiro, briga de relacionamento). Não entre nele: diga
com carinho, em uma frase, que seu forte é o mapa e o app, e ofereça algo que você pode fazer agora.

O QUE EXIGE A FERRAMENTA buscar_lugares:
- Qualquer pedido pra descobrir, encontrar, recomendar ou sugerir um lugar (bar, restaurante,
  balada, café, hotel) — mesmo que vago ("quero sair", "to afim de alguma coisa hoje").
- Nunca responda com um lugar sem ter chamado a ferramenta e recebido os resultados.

LIMITAÇÃO IMPORTANTE DA BUSCA: o banco só filtra pelas categorias largas (bar, restaurante, balada,
café, hotel) — NÃO existe filtro por tipo de cozinha (japonês, italiano, árabe etc.), nem por prato,
nem por preço. Se a pessoa pedir um tipo específico dentro de "restaurante", chame a ferramenta com
category "restaurante" mesmo assim, mas na resposta final NUNCA finja que achou exatamente aquele
tipo — só diga isso se o motivo de algum lugar (que vem da busca) confirmar de verdade. Sem
confirmação, seja honesta: diga que ainda não dá pra filtrar por tipo de comida e que separou os
restaurantes mais bem avaliados da cidade pra pessoa conferir.

Depois que a ferramenta devolver os lugares (já ranqueados, com motivo de cada um), escreva UMA
mensagem curta (1 a 2 frases) apresentando o resultado, sem repetir nome de lugar nem nota — isso a
tela já mostra nos cartões. Se a busca não achar nada, diga isso com leveza e sugira a pessoa ser
quem avalia o primeiro lugar daquele tipo.
`.trim();

// Voz da Irise, a assistente sem personagem. Só entra quando a pessoa NÃO escolheu um irise: com
// personagem, o jeito dele substitui isto inteiro (antes as duas iam juntas e o Léo saía falando
// "mona", que é da Irise, não dele).
const VOZ_IRISE = `
Seu nome é Irise.
SUA VOZ: bicha, afiada, calorosa — fala como uma amiga gay que manja de todo rolê da cidade, não
como um assistente de app. Solta gíria de boca (mona, bofe, arrasou, fervo, sapataria, deusa,
cê é cria, partiu, é dahora) do jeito que sai na conversa de verdade, sem forçar nem em toda
frase. Pode usar "kkk" e emoji com moderação. Tem opinião, reage com entusiasmo de verdade
quando o pedido é bom ("ESSA é a pergunta certa"), zoa com leveza quando cabe. Nunca robótica,
nunca lista de funcionalidades, nunca formal. Ainda assim: nunca usa gíria de um grupo específico
da comunidade (ballroom, bicha preta, etc.) fora de contexto, e nunca exagera a ponto de parecer
caricatura — é gente de verdade, não personagem de piada.
`.trim();

const TOOL_BUSCAR = {
  type: "function",
  function: {
    name: "buscar_lugares",
    description:
      "Busca lugares REAIS no banco da Irisa. Chame sempre que a pessoa quiser descobrir, achar ou ser recomendada um lugar. Nunca responda com um lugar sem chamar isto primeiro.",
    parameters: {
      type: "object",
      properties: {
        categories: {
          type: "array",
          items: { type: "string", enum: CATEGORIAS },
          description: "Categorias pedidas. Omita ou deixe vazio para qualquer categoria.",
        },
        sem_nota: {
          type: "boolean",
          description: "true só se a pessoa quer descobrir um lugar que a comunidade ainda não avaliou (\"irisar\").",
        },
        perto: {
          type: "boolean",
          description: "true se a pessoa pediu algo perto de onde ela está agora.",
        },
      },
    },
  },
};

const TOOL_PROGRESSO = {
  type: "function",
  function: {
    name: "meu_progresso",
    description:
      "Traz os números reais da pessoa no app: nível, gomos, o que falta pro próximo nível, medalhas que tem e as mais perto, avaliações, semana, faíscas e caixinhas. Chame quando a pessoa perguntar do próprio progresso e os dados não vierem na mensagem.",
    parameters: { type: "object", properties: {} },
  },
};

type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

async function chamarGroq(
  db: ReturnType<typeof adminClient>,
  messages: GroqMessage[],
  comFerramenta: boolean,
  comProgresso = true,
) {
  const key = await getApiKey(db, "GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY não configurada (secrets da função ou painel admin).");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.85,
      max_tokens: 300,
      messages,
      ...(comFerramenta
        ? { tools: comProgresso ? [TOOL_BUSCAR, TOOL_PROGRESSO] : [TOOL_BUSCAR], tool_choice: "auto" }
        : {}),
    }),
  });
  const corpo = await res.json();
  if (!res.ok) throw new Error(corpo?.error?.message ?? `Groq recusou (HTTP ${res.status})`);
  return corpo.choices[0].message as GroqMessage;
}

type Candidato = {
  id: string;
  name: string;
  category: string;
  neighborhood: string | null;
  score: number | null;
  rating_count: number | null;
  badge: string | null;
  score_welcome: number | null;
  score_affection: number | null;
  score_restroom: number | null;
  score_crowd: number | null;
  // Resumo escrito por nós (migration 53) — nunca raspado, nunca gerado sem revisão. Ajuda o
  // Gemini a dar um motivo real pra lugar sem nota, que é a maioria.
  description: string | null;
};
type Ranking = { place_id: string; reasons: string[] }[];

async function chamarGemini(
  db: ReturnType<typeof adminClient>,
  texto: string,
  candidatos: Candidato[],
): Promise<Ranking> {
  const key = await getApiKey(db, "GEMINI_API_KEY");
  if (!key || candidatos.length === 0) return candidatos.map((c) => ({ place_id: c.id, reasons: [] }));

  const prompt = `
Pedido da pessoa: "${texto}"

Candidatos reais (JSON, cada um já existe no banco da Irisa):
${JSON.stringify(candidatos)}

Ranqueie do que melhor combina com o pedido para o que menos combina. Para cada um, até 2 motivos
curtos (3 a 6 palavras), baseados SOMENTE nos campos dados (categoria, eixos de acolhimento, selo,
bairro, nº de avaliações, e a "description" quando existir — um resumo escrito por nós, pode citar
com confiança) — nunca invente nada que não esteja nos dados. Sem nota (score null) e sem
description, use algo como "ainda sem avaliação" se for o único motivo coerente.

Responda SOMENTE com JSON: {"ranking": [{"place_id": "...", "reasons": ["...", "..."]}]}
`.trim();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 500 },
      }),
    },
  );
  const corpo = await res.json();
  if (!res.ok) throw new Error(corpo?.error?.message ?? `Gemini recusou (HTTP ${res.status})`);
  const texto2 = (corpo.candidates[0].content.parts[0].text as string)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(texto2) as { ranking?: Ranking };
  const validos = new Set(candidatos.map((c) => c.id));
  return (parsed.ranking ?? []).filter((r) => validos.has(r.place_id));
}


type Personagem = {
  n: number;
  nome: string;
  pronomes: string;
  classe: string;
  bio: string;
  stat_acolhimento: number;
  stat_humor: number;
  stat_papo_reto: number;
  stat_role: number;
};
type Agente = { voz: string; giria: number; emoji: number };

const GIRIA = [
  "Sem gíria. Nunca use mona, bofe, amapô, babado, arrasou, deusa, fervo, close nem outra gíria da comunidade; fala cuidada e simples.",
  "Gíria leve do dia a dia (bora, massa, de boa, tranquilo). Gíria da comunidade (mona, bofe, amapô, babado, arrasou, fervo) só se a voz abaixo pedir.",
  "Pode usar gíria da comunidade (mona, babado, arrasou, fervo) com naturalidade, sem virar caricatura.",
];
const EMOJI = [
  "Não usa emoji.",
  "No máximo um emoji por resposta, e só quando ajuda.",
  "Usa emoji à vontade, até dois por resposta.",
];

/** Bloco de identidade: o chat fala com o nome, os pronomes e o jeito do irise escolhido. */
function blocoPersonagem(p: Personagem, a: Agente | null): string {
  const tracos: string[] = [];
  const nivel = (v: number, alto: string, baixo: string) => {
    if (v >= 4) tracos.push(alto);
    else if (v <= 2) tracos.push(baixo);
  };
  nivel(p.stat_acolhimento, "muito acolhedor: valida o que a pessoa sente antes de qualquer coisa", "acolhe sem melação, mais prático");
  nivel(p.stat_humor, "bem-humorado: brinca e zoa com leveza", "humor contido, mais sereno");
  nivel(p.stat_papo_reto, "papo reto: vai direto ao ponto, sem rodeio", "delicado: escolhe as palavras com cuidado");
  nivel(p.stat_role, "animado com rolê: adora sugerir sair e descobrir lugar", "mais caseiro: prefere lugar tranquilo e conversa boa");
  const giria = a ? GIRIA[a.giria] ?? GIRIA[1] : GIRIA[1];
  const emoji = a ? EMOJI[a.emoji] ?? EMOJI[1] : EMOJI[1];
  return [
    `QUEM VOCÊ É (as regras acima continuam valendo; o jeito de falar é SÓ este, de mais ninguém):`,
    `Seu nome é ${p.nome} (${p.pronomes}), ${p.classe} da Irisa — o irise que a pessoa escolheu pra conversar.`,
    `Se perguntarem seu nome ou quem você é, responda como ${p.nome}. A Irisa é o app; você é ${p.nome}. Nunca diga que é "a Irise".`,
    `Quem você é: ${p.bio}`,
    tracos.length ? `Seu jeito: ${tracos.join("; ")}.` : "",
    `Gíria: ${giria}`,
    `Emoji: ${emoji}`,
    a?.voz ? `Voz e personalidade de ${p.nome}, escritas pela equipe:\n${a.voz}` : "",
    `Nunca use bordão, gíria ou jeito de outro personagem nem da Irise. Se ficar em dúvida se ${p.nome} falaria uma palavra, não fale.`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Perguntas sobre o próprio progresso: com elas, os dados já vão na primeira chamada (uma ida ao modelo
// em vez de duas). O que escapar da regex ainda pode chamar a ferramenta meu_progresso.
const PERGUNTA_PROGRESSO =
  /n[ií]vel|medalh|conquist|ins[ií]gni|avaliei|avalia[çc][õo]es|gomo|fa[ií]sca|caixinha|semana|progress|evolu|subir|pontos|\bxp\b|quant[oa]s? (lugar|avalia|medalh)|o que (me )?falta|meu perfil|meus dados/i;

type Stats = {
  gomos?: number;
  gomos_semana?: number;
  gomos_semana_max?: number;
  semana?: { dias?: number; acesa?: boolean };
  semanas_acesas?: number;
  faiscas?: { total?: number; rumo?: number };
  caixinhas?: number;
  avaliacoes?: number;
  lugares?: number;
  fotos?: number;
  bairros?: number;
  cidades?: number;
  medalhas?: { id: string; ok?: boolean; valor?: number; alvo?: number; unidade?: string }[];
};

/** Resumo curto, em texto, do progresso da pessoa — só números que o app mostra, nada de id interno. */
async function resumoProgresso(db: ReturnType<typeof adminClient>, userId: string): Promise<string> {
  const [{ data: st, error }, { data: perfil }] = await Promise.all([
    db.rpc("gami_stats", { p_user: userId }),
    db.from("profiles").select("medal_form").eq("id", userId).maybeSingle(),
  ]);
  if (error || !st) return "Não consegui ler o progresso agora.";
  const s = st as Stats;
  const forma = Math.min(2, Math.max(0, Number(perfil?.medal_form ?? 2)));
  const nome = (f: string[]) => f[forma] ?? f[0];
  const gomos = Number(s.gomos ?? 0);
  let i = 0;
  NIVEIS.forEach((n, k) => { if (gomos >= n.g) i = k; });
  const prox = NIVEIS[i + 1];
  const linhas = [
    `Nível ${i + 1} de ${NIVEIS.length}: ${nome(NIVEIS[i].f)} (${gomos} de 48 gomos).` +
      (prox ? ` Próximo: ${nome(prox.f)} aos ${prox.g} gomos (faltam ${prox.g - gomos}).` : " Já está no nível máximo."),
    `Gomos acesos nesta semana: ${s.gomos_semana ?? 0} de ${s.gomos_semana_max ?? 4} possíveis. Um gomo vem de: avaliação, 5ª avaliação de um lugar, lugar cadastrado, foto aprovada.`,
    `Avaliações: ${s.avaliacoes ?? 0} · lugares cadastrados: ${s.lugares ?? 0} · fotos aprovadas: ${s.fotos ?? 0} · bairros diferentes: ${s.bairros ?? 0} · cidades: ${s.cidades ?? 0}.`,
    `Semana: app aberto em ${s.semana?.dias ?? 0} de 4 dias${s.semana?.acesa ? " (semana acesa)" : ""}. Semanas acesas no total: ${s.semanas_acesas ?? 0}. Faíscas: ${s.faiscas?.total ?? 0} (${s.faiscas?.rumo ?? 0}/10 pra próxima caixinha). Caixinhas pra abrir: ${s.caixinhas ?? 0}.`,
  ];
  const lista = (s.medalhas ?? []).filter((m) => MEDALHAS[m.id]);
  const tem = lista.filter((m) => m.ok);
  linhas.push(
    `Medalhas: ${tem.length} de ${Object.keys(MEDALHAS).length}` +
      (tem.length ? ` — ${tem.map((m) => nome(MEDALHAS[m.id].t)).join(", ")}.` : " (nenhuma ainda)."),
  );
  const perto = lista
    .filter((m) => !m.ok && Number(m.alvo) > 0)
    .sort((a, b) => Number(b.valor ?? 0) / Number(b.alvo) - Number(a.valor ?? 0) / Number(a.alvo))
    .slice(0, 4);
  if (perto.length) {
    linhas.push(
      "Mais perto de ganhar: " +
        perto
          .map((m) => `${nome(MEDALHAS[m.id].t)} ${m.valor ?? 0}/${m.alvo}${m.unidade ? " " + m.unidade : ""} (${MEDALHAS[m.id].cond.replace(/\.$/, "")})`)
          .join("; ") +
        ".",
    );
  }
  return linhas.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(204, {});
  if (req.method !== "POST") return json(405, { error: "método não aceito" });

  const user = await userFromRequest(req);
  if (!user) return json(401, { error: "Entre na conta para usar a Irise." });

  let body: {
    texto?: string;
    cidade?: string;
    cityId?: number;
    perto?: { lat: number; lng: number } | null;
    personagem?: number | null;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "corpo inválido" });
  }
  const texto = (body.texto ?? "").trim().slice(0, 300);
  if (!texto) return json(400, { error: "texto vazio" });
  const cidade = (body.cidade ?? "").trim().slice(0, 80) || "sua cidade";
  const db = adminClient();

  try {
    // Voz geral (migration 58) + quem é o irise escolhido (migrations 71 e 79). O personagem vem do
    // perfil, não do celular: o app pode estar com o catálogo velho, o banco é quem sabe a escolha.
    const [{ data: vozRow }, { data: perfil }] = await Promise.all([
      db.from("app_settings").select("value").eq("key", "irise_voz_extra").maybeSingle(),
      db.from("profiles").select("irise_personagem").eq("id", user.id).maybeSingle(),
    ]);
    const vozExtra = typeof vozRow?.value === "string" ? vozRow.value.trim() : "";

    const n = perfil?.irise_personagem ?? body.personagem ?? null;
    let quemSou = "";
    if (n) {
      const [{ data: p }, { data: ag }] = await Promise.all([
        db.from("irise_personagens")
          .select("n, nome, pronomes, classe, bio, stat_acolhimento, stat_humor, stat_papo_reto, stat_role")
          .eq("n", n)
          .maybeSingle(),
        db.from("irise_agentes").select("voz, giria, emoji").eq("n", n).maybeSingle(),
      ]);
      if (p) quemSou = blocoPersonagem(p as Personagem, (ag as Agente | null) ?? null);
    }

    // Com personagem, nem a voz da Irise nem a "voz geral" do painel entram: elas trazem gíria e
    // bordão da Irise, e o modelo misturava.
    const systemPrompt = (quemSou ? [SYSTEM_PROMPT, quemSou] : [SYSTEM_PROMPT, VOZ_IRISE, vozExtra])
      .filter(Boolean)
      .join("\n\n");

    const querProgresso = PERGUNTA_PROGRESSO.test(texto);
    const dados = querProgresso ? await resumoProgresso(db, user.id) : "";
    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content:
          `Cidade da pessoa: ${cidade}. Mensagem: "${texto}"` +
          (dados ? `\n\nDADOS DO APP DESTA PESSOA (use só o que a pergunta pedir):\n${dados}` : ""),
      },
    ];
    const primeira = await chamarGroq(db, messages, true, !querProgresso);
    const chamada = primeira.tool_calls?.[0];

    if (!chamada) {
      // Não precisou buscar lugar: resposta direta (conversa, progresso, FAQ do app, acolhimento).
      return json(200, { message: primeira.content ?? "", places: null });
    }

    if (chamada.function.name === "meu_progresso") {
      messages.push(primeira);
      messages.push({ role: "tool", tool_call_id: chamada.id, content: await resumoProgresso(db, user.id) });
      const resposta = await chamarGroq(db, messages, false);
      return json(200, { message: resposta.content ?? "", places: null });
    }

    let args: { categories?: Categoria[]; sem_nota?: boolean; perto?: boolean };
    try {
      args = JSON.parse(chamada.function.arguments || "{}");
    } catch {
      args = {};
    }
    const categories = Array.isArray(args.categories)
      ? args.categories.filter((c): c is Categoria => CATEGORIAS.includes(c))
      : null;

    let candidatos: Candidato[] = [];
    if (args.perto && body.perto) {
      const { data, error } = await db.rpc("places_near", {
        p_lat: body.perto.lat,
        p_lng: body.perto.lng,
        p_limit: 12,
      });
      if (error) throw error;
      candidatos = (data ?? []) as Candidato[];
    } else if (body.cityId) {
      const { data, error } = await db.rpc("irise_suggest_places", {
        p_city_id: body.cityId,
        p_categories: categories && categories.length ? categories : null,
        p_sem_nota: args.sem_nota === true,
        p_limit: 12,
      });
      if (error) throw error;
      candidatos = (data ?? []) as Candidato[];
    }

    let ranking: Ranking = candidatos.map((c) => ({ place_id: c.id, reasons: [] }));
    try {
      ranking = await chamarGemini(db, texto, candidatos);
    } catch (e) {
      console.error("irise-orchestrator: Gemini falhou, seguindo sem ranking:", e);
    }
    const ordenados = ranking.length
      ? ranking.map((r) => candidatos.find((c) => c.id === r.place_id)!).filter(Boolean)
      : candidatos;
    const top = ordenados.slice(0, 3).map((c) => ({
      ...c,
      reason: ranking.find((r) => r.place_id === c.id)?.reasons.join(" · ") || null,
    }));

    // Segunda chamada ao Groq: ele escreve a resposta final já sabendo o que foi achado,
    // mas sem repetir nome/nota (a UI mostra isso nos cartões).
    const resumo = top.map((c) => ({ category: c.category, badge: c.badge, reason: c.reason }));
    messages.push(primeira);
    messages.push({
      role: "tool",
      tool_call_id: chamada.id,
      content: JSON.stringify({ encontrados: top.length, resumo }),
    });
    const segunda = await chamarGroq(db, messages, false);

    return json(200, { message: segunda.content ?? "Separei esses pra você:", places: top });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("irise-orchestrator:", msg);
    return json(502, { error: msg });
  }
});
