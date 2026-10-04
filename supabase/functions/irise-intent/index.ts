// Irise, camada 2 (04/10/2026): só é chamada quando o roteador de palavras-chave do app (camada 1,
// sem IA) não entende o texto livre. Manda pro Groq ou Gemini (IRISE_PROVIDER, padrão groq) e volta
// SÓ a intenção estruturada — nunca um lugar, nunca nome, nota ou endereço: quem busca de verdade é
// a RPC irise_suggest_places, no banco. Nunca manda localização exata, só o nome da cidade.
// Secrets: GROQ_API_KEY e/ou GEMINI_API_KEY (pelo menos um dos dois, conforme IRISE_PROVIDER).
import { adminClient, json } from "../_shared/supabase.ts";

const SYSTEM_PROMPT = `
Você é o roteador de intenção da Irise, assistente de descoberta dentro do app Irisa — uma
comunidade LGBTQIA+ brasileira que avalia lugares em quatro eixos de acolhimento.

Sua ÚNICA tarefa é ler o pedido da pessoa e devolver a intenção estruturada em JSON. Você não tem
acesso ao banco de lugares: NUNCA invente nome de lugar, endereço, nota, selo ou qualquer dado
factual. Quem busca de verdade é outro sistema, depois da sua resposta.

Regras de linguagem, sempre:
- Português do Brasil, em linguagem neutra de gênero (bem-vinde, identificade, acolhide):
  nunca "ele/ela", nunca flexão binária, nunca presuma o gênero de quem escreveu.
- Nunca use "seguro", "lugar seguro", "região tranquila" ou qualquer palavra que sugira garantia
  de segurança — isso nunca é verdade no app e é a frase mais proibida da marca.
- Tom caloroso, direto, sem ser infantil.

Responda SOMENTE com um objeto JSON, sem markdown, sem texto antes ou depois, neste formato exato:
{"categories": array com zero ou mais valores entre ["bar","restaurante","balada","cafe","hotel"], ou null,
 "sem_nota": true somente se a pessoa quer descobrir um lugar que ninguém avaliou ainda, senão false,
 "mensagem": uma frase curta (até 140 caracteres) introduzindo os resultados, no tom da Irisa, sem citar nenhum lugar}
`.trim();

const CATEGORIAS_VALIDAS = new Set(["bar", "restaurante", "balada", "cafe", "hotel"]);

type Intent = { categories: string[] | null; sem_nota: boolean; mensagem: string };

function limpar(bruto: unknown): Intent {
  const o = (bruto ?? {}) as Partial<Intent>;
  const categories = Array.isArray(o.categories)
    ? o.categories.filter((c): c is string => typeof c === "string" && CATEGORIAS_VALIDAS.has(c))
    : null;
  return {
    categories: categories && categories.length ? categories : null,
    sem_nota: o.sem_nota === true,
    mensagem:
      typeof o.mensagem === "string" && o.mensagem.trim()
        ? o.mensagem.trim().slice(0, 200)
        : "Separei esses pra você:",
  };
}

function extrairJson(texto: string): unknown {
  // Alguns modelos devolvem o JSON dentro de ```json ... ``` mesmo quando pedido sem markdown.
  const limpo = texto.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(limpo);
}

async function chamarGroq(texto: string, cidade: string): Promise<Intent> {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY não configurada nos secrets da função.");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Cidade da pessoa: ${cidade}. Pedido: "${texto}"` },
      ],
    }),
  });
  const corpo = await res.json();
  if (!res.ok) throw new Error(corpo?.error?.message ?? `Groq recusou (HTTP ${res.status})`);
  return limpar(extrairJson(corpo.choices[0].message.content));
}

async function chamarGemini(texto: string, cidade: string): Promise<Intent> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY não configurada nos secrets da função.");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: `Cidade da pessoa: ${cidade}. Pedido: "${texto}"` }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json", maxOutputTokens: 300 },
      }),
    },
  );
  const corpo = await res.json();
  if (!res.ok) throw new Error(corpo?.error?.message ?? `Gemini recusou (HTTP ${res.status})`);
  return limpar(extrairJson(corpo.candidates[0].content.parts[0].text));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(204, {});
  if (req.method !== "POST") return json(405, { error: "método não aceito" });

  const db = adminClient();
  const auth = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userRes } = await db.auth.getUser(auth);
  if (!userRes?.user) return json(401, { error: "Entre na conta para usar a Irise." });

  let body: { texto?: string; cidade?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "corpo inválido" });
  }
  const texto = (body.texto ?? "").trim().slice(0, 300);
  if (!texto) return json(400, { error: "texto vazio" });
  // Nunca a localização exata: só o nome da cidade, se houver.
  const cidade = (body.cidade ?? "").trim().slice(0, 80) || "sua cidade";

  const provider = (Deno.env.get("IRISE_PROVIDER") ?? "groq").toLowerCase();
  try {
    const intent = provider === "gemini" ? await chamarGemini(texto, cidade) : await chamarGroq(texto, cidade);
    return json(200, { ...intent, provider });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("irise-intent:", msg);
    return json(502, { error: msg });
  }
});
