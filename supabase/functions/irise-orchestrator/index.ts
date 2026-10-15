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

// Prompt enxuto de propósito (14/10/2026): o plano grátis do Groq dá 200 mil tokens por dia e 8 mil
// por minuto para o app inteiro, e este texto vai em toda mensagem. As regras de busca só entram
// quando a mensagem tem cara de pedido de lugar (REGRAS_BUSCA).
const SYSTEM_PROMPT = `
Você é o irise da pessoa no app Irisa (comunidade LGBTQIA+): lugares avaliados em 4 eixos de
acolhimento (atendimento, afeto, banheiro, clientela) e relatos anônimos de LGBTIfobia.

SEMPRE:
- Português do Brasil; com a pessoa, linguagem neutra (bem-vinde, acolhide), nunca presuma gênero. De
  você, use seus pronomes.
- Nunca diga "seguro", "lugar seguro" ou "região tranquila".
- Nunca invente lugar, nota, endereço ou número.
- Use o que a pessoa já disse nesta conversa (como está, o que pediu, o que você já sugeriu). Sempre responda.

JEITO (o mais importante): amigo no WhatsApp, não atendente.
- 1 ou 2 frases. Lista só se pedirem medalhas/números (até 4 itens com "• "). Texto puro, sem markdown.
- Cumprimento só na sua primeira mensagem; depois nunca comece com "oi"/"olá" nem se apresente de novo.
- Não repita abertura, frase de carinho nem oferta já feita. Reaja ao que a pessoa disse, com as palavras dela.
- Nem toda mensagem termina em pergunta. Nada de frase de manual ("entendo como você se sente",
  "estou aqui para ajudar", "como posso te ajudar?"). Se ela só quer conversar, converse.

SEM FERRAMENTA:
- Como o app funciona: selo só com 5 avaliações; relato é anônimo, não pontua e não derruba a nota do
  lugar (só se apontar o próprio lugar); emergência liga 190/192/100/188.
- Progresso (nível, gomos, medalhas, avaliações, semana, faíscas, caixinhas): só com os números do bloco
  "DADOS DO APP DESTA PESSOA", exatos, dizendo a ação que falta. Cada semana acende no máximo 4 gomos.
- Pessoa triste, sozinha ou com medo: primeiro só esteja com ela, algo verdadeiro e curto; se couber,
  pergunte com delicadeza o que houve. Aba Apoio ou relato no máximo uma vez na conversa e só quando
  cabe (relato só se ela contar discriminação ou violência). Perigo agora: 190. Qualquer sinal de se
  machucar ou não querer viver: CVV 188 (grátis, 24 h), antes de tudo. Sem terapia, sem interrogatório.
- Assunto fora do app que pede conversa longa ou especialista (trabalho, código, política, saúde,
  jurídico, dinheiro): diga com carinho, numa frase, que seu forte é o mapa, e ofereça algo do app.
`.trim();

const REGRAS_BUSCA = `
LUGARES (ferramenta buscar_lugares):
- Todo pedido de lugar, mesmo vago ("quero sair"), chama a ferramenta. Nunca cite lugar sem ela.
- Se você ofereceu um tipo ("cafés tranquilos") e a pessoa topou, busque exatamente essa categoria.
- Pessoa que não está bem: acolha primeiro; se ela não pediu lugar, pergunte se quer um canto tranquilo
  e espere topar. Ao buscar pra ela: acolhedor=true e café (ou o que pediu), nunca balada sem pedir.
- A busca só filtra bar, restaurante, balada, café, hotel. Tipo de cozinha, prato ou preço não: use a
  categoria larga e nunca finja que achou o tipo exato.
`.trim();

// Segunda chamada, depois da busca: só isto + quem é o irise, sem o prompt inteiro nem ferramentas.
const FINAL_BUSCA = `
Os lugares já aparecem em cartões na tela. Escreva 1 frase curta, calorosa e natural apresentando o que
achou, no seu jeito, sem citar nome de lugar nem nota, sem "oi". Achou 0: diga com leveza e convide a
pessoa a avaliar o primeiro. Nunca diga "seguro". Linguagem neutra com a pessoa.
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
        acolhedor: {
          type: "boolean",
          description:
            "true quando a pessoa não está bem, pediu um lugar tranquilo/acolhedor ou quer se sentir bem-vinde: prioriza lugares com selo e nota alta em atendimento e afeto.",
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

// Assunto de suicídio ou de se machucar (pedido do Leandro, 14/10/2026): vai direto para o CVV, sem
// gastar chamada de modelo e sem risco de resposta improvisada. Mesma lista de src/lib/crise.ts —
// mudou lá, mudar aqui.
const CRISE =
  /suicid|me matar|matar a mim|me mato|quero morrer|queria morrer|vontade de morrer|prefiro morrer|melhor (eu )?morrer|morrer logo|nao quero (mais )?viver|nao aguento mais viver|cansad[oae] de viver|sem vontade de viver|tirar (a )?minha (propria )?vida|acabar com (a )?minha vida|acabar com tudo|dar fim (a|na) minha vida|por fim (a|na) minha vida|me cortar|me corto|me machucar|me machuco|automutil|auto ?lesao|me enforcar|tomar (todos os|uns|varios) remedios|overdose|pular (da|de uma|do) (ponte|predio|janela|sacada)|me jogar (da|de uma|do|na frente)|seria melhor sem mim|melhor sem mim|ninguem sentiria (a )?minha falta|nao vale a pena viver|sumir pra sempre|desaparecer pra sempre/;
function ehCrise(texto: string) {
  return CRISE.test(texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
}
const MENSAGEM_CRISE =
  "Que bom que você falou. Você não precisa passar por isso sozinhe. Liga agora pro CVV, o Centro de Valorização da Vida: 188, de graça, 24 horas, com gente pronta pra te ouvir. Se estiver em perigo agora, liga 192. Eu sigo aqui com você.";

type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

// Cota do Groq estourada (por minuto ou por dia): o chat passa a responder pelo Gemini, sem ferramenta.
class LimiteGroq extends Error {}

// Reserva quando o Groq bate o limite: mesma conversa, só texto, pelo Gemini (thinking desligado,
// senão o pensamento come o limite de saída).
async function conversarGemini(
  db: ReturnType<typeof adminClient>,
  system: string,
  messages: GroqMessage[],
  usos?: Uso[],
): Promise<string> {
  const key = await getApiKey(db, "GEMINI_API_KEY");
  if (!key) return "";
  const contents = messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content)
    .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content as string }] }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 300, thinkingConfig: { thinkingBudget: 0 } },
      }),
    },
  );
  const corpo = await res.json();
  if (!res.ok) throw new Error(corpo?.error?.message ?? `Gemini recusou (HTTP ${res.status})`);
  usos?.push({
    provedor: "gemini",
    tipo: "conversa",
    tokens_in: corpo.usageMetadata?.promptTokenCount ?? 0,
    tokens_out: corpo.usageMetadata?.candidatesTokenCount ?? 0,
  });
  return ((corpo.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]).map((x) => x.text ?? "").join("").trim();
}

async function chamarGroq(
  db: ReturnType<typeof adminClient>,
  messages: GroqMessage[],
  ferramentas: unknown[],
  temperatura = 0.85,
  usos?: Uso[],
  tipo: Uso["tipo"] = "conversa",
) {
  const key = await getApiKey(db, "GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY não configurada (secrets da função ou painel admin).");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: temperatura,
      // O gpt-oss "pensa" antes de responder e esse pensamento sai do mesmo limite: com 300 ele às
      // vezes gastava tudo pensando e a resposta vinha vazia (o chat ficava mudo). O tamanho da
      // resposta quem segura é o prompt (3 frases); aqui é só teto.
      max_completion_tokens: 1000,
      ...(GROQ_MODEL.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
      messages,
      ...(ferramentas.length ? { tools: ferramentas, tool_choice: "auto" } : {}),
    }),
  });
  const corpo = await res.json();
  if (res.status === 429) throw new LimiteGroq(corpo?.error?.message ?? "limite do Groq");
  if (!res.ok) throw new Error(corpo?.error?.message ?? `Groq recusou (HTTP ${res.status})`);
  usos?.push({
    provedor: "groq",
    tipo,
    tokens_in: corpo.usage?.prompt_tokens ?? 0,
    tokens_out: corpo.usage?.completion_tokens ?? 0,
    rl_pedidos_limite: numHeader(res.headers, "x-ratelimit-limit-requests"),
    rl_pedidos_restantes: numHeader(res.headers, "x-ratelimit-remaining-requests"),
  });
  const m = corpo.choices[0].message as GroqMessage & { reasoning?: string };
  // Só o que pode voltar pro modelo na próxima chamada (o campo "reasoning" não pode).
  return { role: "assistant", content: m.content ?? null, ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}) } as GroqMessage;
}

// Uso de tokens (migration 80): só números, nunca o texto da conversa.
type Uso = {
  provedor: "groq" | "gemini" | "nenhum";
  tipo: "conversa" | "busca" | "progresso" | "ranking" | "crise" | "limite";
  tokens_in: number;
  tokens_out: number;
  rl_pedidos_limite?: number | null;
  rl_pedidos_restantes?: number | null;
};
async function registrarUso(db: ReturnType<typeof adminClient>, userId: string | null, usos: Uso[]) {
  if (!usos.length) return;
  const { error } = await db.from("irise_uso").insert(usos.map((u) => ({ ...u, user_id: userId })));
  if (error) console.warn("irise-orchestrator: não registrou uso:", error.message);
}
const numHeader = (h: Headers, k: string) => {
  const v = Number(h.get(k));
  return Number.isFinite(v) && h.get(k) !== null ? v : null;
};

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
  usos?: Uso[],
): Promise<Ranking> {
  const key = await getApiKey(db, "GEMINI_API_KEY");
  if (!key || candidatos.length === 0) return candidatos.map((c) => ({ place_id: c.id, reasons: [] }));

  const prompt = `
Pedido da pessoa (com o que ela já tinha dito na conversa): "${texto}"

Candidatos reais (JSON, cada um já existe no banco da Irisa):
${JSON.stringify(candidatos)}

Ranqueie do que melhor combina com o pedido para o que menos combina. Se a pessoa disse que não está
bem ou pediu algo acolhedor/tranquilo, ponha na frente quem tem selo e nota alta em atendimento e afeto,
e deixe lugar agitado (balada, bar de música alta) por último. Para cada um, até 2 motivos
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
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          maxOutputTokens: 600,
          // Sem isto o 2.5 Flash "pensa" e o pensamento sai do mesmo limite de 500: o JSON vinha cortado.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  );
  const corpo = await res.json();
  if (!res.ok) throw new Error(corpo?.error?.message ?? `Gemini recusou (HTTP ${res.status})`);
  usos?.push({
    provedor: "gemini",
    tipo: "ranking",
    tokens_in: corpo.usageMetadata?.promptTokenCount ?? 0,
    tokens_out: (corpo.usageMetadata?.candidatesTokenCount ?? 0) + (corpo.usageMetadata?.thoughtsTokenCount ?? 0),
  });
  const texto2 = (corpo.candidates[0].content.parts[0].text as string)
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const parsed = JSON.parse(texto2) as { ranking?: Ranking };
  const validos = new Set(candidatos.map((c) => c.id));
  return (parsed.ranking ?? []).filter((r) => validos.has(r.place_id));
}


// Rede de segurança: personagem com gíria 0 ou 1 não solta vocativo da comunidade, mesmo se o modelo
// escorregar. Só tira a palavra quando ela não está escrita na voz do personagem.
const VOCATIVOS = ["mona", "monas", "bofe", "bofes", "amapô", "migs", "bee", "mana", "diva", "deusa", "gata", "amiga", "amigue"];
// Estas nunca são palavra comum: saem até no meio da frase. As outras ("amiga", "diva"…) só como vocativo.
const SO_GIRIA = new Set(["mona", "monas", "bofe", "bofes", "amapô", "migs", "bee"]);
function semGiriaAlheia(texto: string, agente: Agente | null | undefined): string {
  if (agente === undefined) return texto; // sem personagem: voz da Irise, livre
  if ((agente?.giria ?? 1) >= 2) return texto;
  const voz = (agente?.voz ?? "").toLowerCase();
  let t = texto;
  for (const w of VOCATIVOS) {
    if (voz.includes(w)) continue;
    const L = "\\p{L}";
    t = t
      // "Oi, mona!" · "tô contigo, mona." · "fica tranquilo mona"
      .replace(new RegExp(`,?\\s+${w}(?!${L})(?=\\s*[!?.,…]|\\s*$)`, "giu"), "")
      // "Mona, bora?" no começo de frase
      .replace(new RegExp(`(^|[.!?]\\s+)${w}(?!${L})[,!]?\\s+`, "giu"), "$1");
    if (SO_GIRIA.has(w)) t = t.replace(new RegExp(`(?<!${L})${w}(?!${L})`, "giu"), "");
  }
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").replace(/^[,\s]+/, "").trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
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

// Sem citar as gírias pelo nome: listar "não use mona, bofe…" puxava o modelo a usar justamente essas.
const GIRIA = [
  "Sem gíria nenhuma. Português simples, cuidado e direto, como alguém educado falando com uma pessoa querida.",
  "Gíria só a do dia a dia de qualquer brasileiro (bora, massa, de boa). Nada de gíria da comunidade, a não ser palavra que esteja escrita na sua voz abaixo.",
  "Pode usar gíria da comunidade LGBTQIA+ com naturalidade, sem virar caricatura.",
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

// Cara de pedido de lugar (liga a ferramenta de busca e as regras de lugar no prompt).
const PEDE_LUGAR =
  /lugar|\bbar(es)?\b|caf[eé]|restaurante|balada|hotel|pousada|hospeda|comer|beber|almo[cç]|jant|lanch|pizza|drink|cerveja|vinho|sair\b|sa[ií]da|rol[eê]|date|encontro|festa|dan[cç]ar|show|indica|sugest|recomend|perto|onde (eu )?(posso|vou|tem)|algum canto|me leva/i;
// O irise acabou de oferecer lugar: "pode ser", "bora", "sim" precisam da busca.
const OFERECEU_LUGAR = /lugar|caf[eé]|\bbar\b|restaurante|canto|sugest|te mostr|procur|buscar|rol[eê]/i;
// Pode ser pergunta de progresso que escapou da regex de baixo: só aí a ferramenta vai junto.
const PODE_SER_PROGRESSO = /\bmeu|\bminha|\bquant[oa]s?\b|\bfalta|\btenho\b/i;

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

// Quem tem selo e nota alta em atendimento/afeto primeiro; sem nota depois; balada por último.
function acolhedoresPrimeiro(lista: Candidato[]) {
  const peso = (c: Candidato) =>
    (c.badge === "bem" ? 40 : c.badge === "acolhedor" ? 30 : 0) +
    ((c.score_welcome ?? 0) + (c.score_affection ?? 0)) * 4 +
    (c.score != null ? 5 : 0) -
    (c.category === "balada" ? 50 : 0);
  return [...lista].sort((a, b) => peso(b) - peso(a));
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
    /** Últimas mensagens da conversa aberta no app (só o texto; fica no celular, não é guardado aqui). */
    historico?: { de?: string; texto?: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "corpo inválido" });
  }
  const texto = (body.texto ?? "").trim().slice(0, 300);
  if (!texto) return json(400, { error: "texto vazio" });
  // Suicídio ou se machucar: nunca passa pelo modelo. Resposta fixa com o CVV, e o app mostra o
  // botão de ligar (`crise: true`).
  const db = adminClient();
  if (ehCrise(texto)) {
    // Só a contagem, sem a pessoa: ligar quem pediu ajuda a um registro seria dado de saúde.
    await registrarUso(db, null, [{ provedor: "nenhum", tipo: "crise", tokens_in: 0, tokens_out: 0 }]);
    return json(200, { message: MENSAGEM_CRISE, places: null, crise: true });
  }
  const cidade = (body.cidade ?? "").trim().slice(0, 80) || "sua cidade";
  const usos: Uso[] = [];

  try {
    // Voz geral (migration 58) + quem é o irise escolhido (migrations 71 e 79). O personagem vem do
    // perfil, não do celular: o app pode estar com o catálogo velho, o banco é quem sabe a escolha.
    const [{ data: vozRow }, { data: perfil }] = await Promise.all([
      db.from("app_settings").select("value").eq("key", "irise_voz_extra").maybeSingle(),
      db.from("profiles").select("irise_personagem").eq("id", user.id).maybeSingle(),
    ]);
    const vozExtra = typeof vozRow?.value === "string" ? vozRow.value.trim() : "";

    // Limite de mensagens por pessoa por dia (painel → Uso do irise; vazio = sem limite).
    const { data: limRow } = await db.from("app_settings").select("value").eq("key", "irise_limite_msgs_pessoa").maybeSingle();
    const limite = typeof limRow?.value === "number" ? limRow.value : null;
    if (limite) {
      const { data: usadas } = await db.rpc("irise_msgs_hoje", { p_user: user.id });
      if (typeof usadas === "number" && usadas >= limite) {
        await registrarUso(db, user.id, [{ provedor: "nenhum", tipo: "limite", tokens_in: 0, tokens_out: 0 }]);
        return json(200, {
          message:
            "Hoje a gente já conversou bastante e eu preciso descansar um pouco. Amanhã eu volto. Enquanto isso, o mapa e a aba Apoio estão aí pra você.",
          places: null,
        });
      }
    }

    const n = perfil?.irise_personagem ?? body.personagem ?? null;
    let quemSou = "";
    let nomePersonagem = "";
    let agente: Agente | null = null;
    if (n) {
      const [{ data: p }, { data: ag }] = await Promise.all([
        db.from("irise_personagens")
          .select("n, nome, pronomes, classe, bio, stat_acolhimento, stat_humor, stat_papo_reto, stat_role")
          .eq("n", n)
          .maybeSingle(),
        db.from("irise_agentes").select("voz, giria, emoji").eq("n", n).maybeSingle(),
      ]);
      if (p) {
        quemSou = blocoPersonagem(p as Personagem, (ag as Agente | null) ?? null);
        nomePersonagem = (p as Personagem).nome;
        agente = (ag as Agente | null) ?? null;
      }
      console.log(`irise-orchestrator: personagem ${n} (${nomePersonagem || "não achado"}), gíria ${agente?.giria ?? "padrão"}`);
    }

    // Com personagem, nem a voz da Irise nem a "voz geral" do painel entram: elas trazem gíria e
    // bordão da Irise, e o modelo misturava.
    // Com personagem, a identidade vem PRIMEIRO (o modelo pesa mais o começo) e de novo no fim.
    const historicoBruto = (Array.isArray(body.historico) ? body.historico : [])
      .filter((h) => typeof h?.texto === "string" && h.texto.trim())
      .slice(-8);
    const ultimaDoIrise = [...historicoBruto].reverse().find((h) => h.de !== "eu")?.texto ?? "";
    // Ferramenta de busca e regras de lugar só quando a mensagem tem cara de pedido de lugar, ou
    // quando o irise acabou de oferecer um ("quer um café tranquilo?" → "pode ser").
    const precisaBusca = PEDE_LUGAR.test(texto) || OFERECEU_LUGAR.test(ultimaDoIrise);
    const querProgresso = PERGUNTA_PROGRESSO.test(texto);
    const ferramentas = [
      ...(precisaBusca ? [TOOL_BUSCAR] : []),
      ...(!querProgresso && PODE_SER_PROGRESSO.test(texto) ? [TOOL_PROGRESSO] : []),
    ];
    const jeito = quemSou ? [quemSou] : [VOZ_IRISE, vozExtra];
    const systemPrompt = (quemSou
      ? [quemSou, SYSTEM_PROMPT, precisaBusca ? REGRAS_BUSCA : "", `Lembrete final: você é ${nomePersonagem}. Fale só do jeito de ${nomePersonagem}.`]
      : [SYSTEM_PROMPT, precisaBusca ? REGRAS_BUSCA : "", VOZ_IRISE, vozExtra])
      .filter(Boolean)
      .join("\n\n");

    const dados = querProgresso ? await resumoProgresso(db, user.id) : "";
    const historico: GroqMessage[] = historicoBruto
      .map((h) => ({ role: h.de === "eu" ? "user" : "assistant", content: h.texto!.trim().slice(0, 300) }));
    // O Gemini só via a última frase ("pode ser") e não sabia que a pessoa estava triste nem que
    // tinha topado café: vai junto o que ela disse antes.
    const pedidoComContexto = [
      ...historico.filter((h) => h.role === "user").slice(-3).map((h) => h.content as string),
      texto,
    ].join(" / ").slice(0, 600);
    const messages: GroqMessage[] = [
      { role: "system", content: systemPrompt },
      ...historico,
      {
        role: "user",
        content:
          `Cidade da pessoa: ${cidade}. Mensagem: "${texto}"` +
          (dados ? `\n\nDADOS DO APP DESTA PESSOA (use só o que a pergunta pedir):\n${dados}` : ""),
      },
    ];
    const temp = quemSou ? 0.6 : 0.85;
    // Rede de segurança contra o "oi" em toda mensagem: com conversa em andamento, tira o cumprimento
    // do começo (o prompt já pede isso, mas o modelo escorrega).
    const jaFalou = historico.some((h) => h.role === "assistant");
    const semOi = (t: string) => {
      if (!jaFalou) return t;
      const r = t.replace(/^\s*(oi+|ol[áa]|e a[íi]|eai|opa|hey|ei)\b(,?\s*[^.!?,\n]{0,20})?[!,.?]+\s*/i, "");
      return r ? r.charAt(0).toUpperCase() + r.slice(1) : t;
    };
    const limpar = (t: string | null | undefined) => semOi(semGiriaAlheia(t ?? "", quemSou ? agente : undefined));
    // Nunca mudo: se o modelo devolver vazio, tenta mais uma vez sem ferramenta; se ainda vier
    // vazio, uma frase de acolhimento no lugar do silêncio.
    const reserva = "Tô aqui com você. Me conta um pouco mais do que tá rolando?";
    const semVazio = async (t: string | null | undefined) => {
      let r = limpar(t);
      if (!r) {
        console.warn("irise-orchestrator: resposta vazia, tentando de novo");
        r = limpar((await chamarGroq(db, messages, [], temp, usos).catch(() => ({ content: null }))).content);
      }
      return r || reserva;
    };
    let primeira: GroqMessage;
    try {
      primeira = await chamarGroq(db, messages, ferramentas, temp, usos, querProgresso ? "progresso" : "conversa");
    } catch (e) {
      if (!(e instanceof LimiteGroq)) throw e;
      // Groq no limite: conversa pelo Gemini, sem busca (os lugares seguem no mapa e em Lugares).
      console.warn("irise-orchestrator: Groq no limite, respondendo pelo Gemini");
      const system = [systemPrompt.replace(REGRAS_BUSCA, ""),
        "Agora você não consegue buscar lugares. Se pedirem, diga com leveza que dá pra ver no Mapa ou em Lugares do app."].join("\n\n");
      const message = limpar(await conversarGemini(db, system, messages, usos).catch(() => "")) || reserva;
      await registrarUso(db, user.id, usos);
      return json(200, { message, places: null });
    }
    const chamada = primeira.tool_calls?.[0];

    if (!chamada) {
      // Não precisou buscar lugar: resposta direta (conversa, progresso, FAQ do app, acolhimento).
      const message = await semVazio(primeira.content);
      await registrarUso(db, user.id, usos);
      return json(200, { message, places: null });
    }

    if (chamada.function.name === "meu_progresso") {
      messages.push(primeira);
      messages.push({ role: "tool", tool_call_id: chamada.id, content: await resumoProgresso(db, user.id) });
      const resposta = await chamarGroq(db, messages, [], temp, usos, "progresso");
      const message = await semVazio(resposta.content);
      await registrarUso(db, user.id, usos);
      return json(200, { message, places: null });
    }

    let args: { categories?: Categoria[]; sem_nota?: boolean; perto?: boolean; acolhedor?: boolean };
    try {
      args = JSON.parse(chamada.function.arguments || "{}");
    } catch {
      args = {};
    }
    const categories = Array.isArray(args.categories)
      ? args.categories.filter((c): c is Categoria => CATEGORIAS.includes(c))
      : null;

    let candidatos: Candidato[] = [];
    const pediuCategoria = !!(categories && categories.length);
    if (args.perto && body.perto) {
      // Antes o "perto" ignorava a categoria e trazia os 12 mais próximos de qualquer tipo (pediu
      // café acolhedor, veio bar de vinho, bar de rock e pizzaria — 14/10/2026). Agora busca por
      // categoria e, com várias, junta as listas.
      const listas = await Promise.all(
        (pediuCategoria ? categories! : [null]).map(async (cat) => {
          const { data, error } = await db.rpc("places_near", {
            p_lat: body.perto!.lat,
            p_lng: body.perto!.lng,
            p_category: cat,
            p_limit: args.acolhedor ? 60 : 24,
          });
          if (error) throw error;
          return (data ?? []) as Candidato[];
        }),
      );
      candidatos = listas.flat();
      if (args.acolhedor) candidatos = acolhedoresPrimeiro(candidatos);
      candidatos = candidatos.slice(0, 12);
    } else if (body.cityId) {
      const { data, error } = await db.rpc("irise_suggest_places", {
        p_city_id: body.cityId,
        p_categories: categories && categories.length ? categories : null,
        p_sem_nota: args.sem_nota === true,
        p_limit: 12,
      });
      if (error) throw error;
      candidatos = (data ?? []) as Candidato[];
      if (args.acolhedor) candidatos = acolhedoresPrimeiro(candidatos);
    }
    // Rede de segurança: nunca sai lugar fora da categoria pedida.
    if (pediuCategoria) candidatos = candidatos.filter((c) => categories!.includes(c.category as Categoria));

    let ranking: Ranking = candidatos.map((c) => ({ place_id: c.id, reasons: [] }));
    try {
      ranking = await chamarGemini(db, pedidoComContexto, candidatos, usos);
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
    // Segunda chamada pequena: só quem é o irise + como apresentar, sem o prompt inteiro nem ferramentas
    // (era a metade do gasto de uma busca).
    const segunda = await chamarGroq(db, [
      { role: "system", content: [...jeito, FINAL_BUSCA].filter(Boolean).join("\n\n") },
      {
        role: "user",
        content: `O que a pessoa disse: "${pedidoComContexto}". Resultado da busca: ${JSON.stringify({ encontrados: top.length, resumo })}`,
      },
    ], [], temp, usos, "busca").catch((e) => {
      if (e instanceof LimiteGroq) return { role: "assistant", content: null } as GroqMessage;
      throw e;
    });
    await registrarUso(db, user.id, usos);

    return json(200, { message: limpar(segunda.content) || "Separei esses pra você:", places: top });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("irise-orchestrator:", msg);
    await registrarUso(db, user.id, usos);
    if (err instanceof LimiteGroq) {
      return json(200, { message: "Tô com a cabeça cheia agora, me dá um minutinho e me chama de novo?", places: null });
    }
    return json(502, { error: msg });
  }
});
