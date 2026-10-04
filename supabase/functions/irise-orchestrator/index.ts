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
import { adminClient, json, userFromRequest } from "../_shared/supabase.ts";

const GROQ_MODEL = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") ?? "gemini-1.5-flash";

const CATEGORIAS = ["bar", "restaurante", "balada", "cafe", "hotel"] as const;
type Categoria = (typeof CATEGORIAS)[number];

const SYSTEM_PROMPT = `
Você é a Irise, assistente de descoberta dentro da Irisa — app brasileiro da comunidade LGBTQIA+
que avalia lugares em quatro eixos de acolhimento (atendimento, afeto, banheiro, clientela) e tem
relatos anônimos de LGBTIfobia.

SUA VOZ: calorosa, direta, um pouco engraçada e solta, nunca infantil. Pode usar "kkk" com
moderação. Fale como gente, não como manual.

REGRAS DE LINGUAGEM, SEMPRE:
- Português do Brasil, linguagem neutra de gênero (bem-vinde, identificade, acolhide): nunca
  "ele/ela", nunca flexão binária, nunca presuma o gênero de quem escreveu.
- NUNCA diga "seguro", "lugar seguro" ou "região tranquila" — o app nunca garante isso.
- NUNCA invente nome de lugar, nota, endereço ou qualquer dado — você não tem acesso ao banco
  diretamente. Para recomendar um lugar, SEMPRE chame a ferramenta buscar_lugares.

O QUE VOCÊ FAZ SEM FERRAMENTA (responda direto, com o que você sabe sobre o app):
- Perguntas sobre como a Irisa funciona: avaliação em 4 eixos, selo só depois de 5 avaliações,
  relato é anônimo e nunca derruba a nota do lugar (só relato que aponta o próprio lugar conta),
  botão de emergência liga 190/192/100/188, "o lugar recebe cor, a rua recebe aviso".
- Conversa casual, agradecimentos, perguntas que não pedem lugar nenhum.

O QUE EXIGE A FERRAMENTA buscar_lugares:
- Qualquer pedido pra descobrir, encontrar, recomendar ou sugerir um lugar (bar, restaurante,
  balada, café, hotel) — mesmo que vago ("quero sair", "to afim de alguma coisa hoje").
- Nunca responda com um lugar sem ter chamado a ferramenta e recebido os resultados.

Depois que a ferramenta devolver os lugares (já ranqueados, com motivo de cada um), escreva UMA
mensagem curta (1 a 2 frases) apresentando o resultado, sem repetir nome de lugar nem nota — isso a
tela já mostra nos cartões. Se a busca não achar nada, diga isso com leveza e sugira a pessoa ser
quem avalia o primeiro lugar daquele tipo.
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

type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

async function chamarGroq(messages: GroqMessage[], comFerramenta: boolean) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY não configurada nos secrets da função.");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.6,
      max_tokens: 300,
      messages,
      ...(comFerramenta ? { tools: [TOOL_BUSCAR], tool_choice: "auto" } : {}),
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

async function chamarGemini(texto: string, candidatos: Candidato[]): Promise<Ranking> {
  const key = Deno.env.get("GEMINI_API_KEY");
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(204, {});
  if (req.method !== "POST") return json(405, { error: "método não aceito" });

  const user = await userFromRequest(req);
  if (!user) return json(401, { error: "Entre na conta para usar a Irise." });

  let body: { texto?: string; cidade?: string; cityId?: number; perto?: { lat: number; lng: number } | null };
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
    const messages: GroqMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Cidade da pessoa: ${cidade}. Mensagem: "${texto}"` },
    ];
    const primeira = await chamarGroq(messages, true);
    const chamada = primeira.tool_calls?.[0];

    if (!chamada) {
      // Não precisou buscar lugar: resposta direta (conversa, FAQ do app).
      return json(200, { message: primeira.content ?? "", places: null });
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
      ranking = await chamarGemini(texto, candidatos);
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
    const segunda = await chamarGroq(messages, false);

    return json(200, { message: segunda.content ?? "Separei esses pra você:", places: top });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("irise-orchestrator:", msg);
    return json(502, { error: msg });
  }
});
