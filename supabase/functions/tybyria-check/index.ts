// TybyrIA v2.2 (migration 52): escaneia avaliações e mensagens do mural atrás de discurso de ódio
// anti-LGBTQIA+, pelo modelo público Veronyka/tybyria-v2.2 (Hugging Face, projeto Código Não
// Binário). Chamada pelo pg_cron de 10 em 10 min quando há algo pendente. Nunca esconde conteúdo
// sozinha: score ≥ 0,40 (limiar do próprio modelo) vira denúncia automática, que cai na mesma fila
// de moderação de sempre — revisão continua sendo humana.
// Secret: HF_API_TOKEN (grátis, huggingface.co → Settings → Access Tokens, nível "read" basta).
import { adminClient, getApiKey, json } from "../_shared/supabase.ts";

const HF_URL = "https://api-inference.huggingface.co/models/Veronyka/tybyria-v2.2";
const LIMIAR = 0.4;

type Pendente = { target_type: "rating" | "message"; target_id: string; texto: string };
type HFResultado = { label: string; score: number }[];

async function classificar(texto: string, token: string): Promise<number> {
  const res = await fetch(HF_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ inputs: texto }),
  });
  const corpo = await res.json();
  if (!res.ok) {
    // Modelo "frio" (cold start) devolve 503 com estimated_time: espera uma vez e tenta de novo.
    if (res.status === 503 && typeof corpo?.estimated_time === "number") {
      await new Promise((r) => setTimeout(r, Math.min(corpo.estimated_time * 1000, 15000)));
      return classificar(texto, token);
    }
    throw new Error(corpo?.error ?? `Hugging Face recusou (HTTP ${res.status})`);
  }
  const linhas = (Array.isArray(corpo[0]) ? corpo[0] : corpo) as HFResultado;
  const hate = linhas.find((l) => /hate/i.test(l.label));
  return hate?.score ?? 0;
}

Deno.serve(async (req) => {
  const db = adminClient();
  const { data: ok } = await db.rpc("tybyria_autorizado", { p_secret: req.headers.get("x-cron-secret") ?? "" });
  if (!ok) return json(401, { error: "não autorizado" });

  const token = await getApiKey(db, "HF_API_TOKEN");
  if (!token) return json(500, { error: "HF_API_TOKEN não configurada (secrets da função ou painel admin)." });

  const { data: pendentes, error } = await db.rpc("tybyria_pendentes", { p_limit: 30 });
  if (error) return json(500, { error: error.message });

  let checados = 0;
  let sinalizados = 0;
  for (const item of (pendentes ?? []) as Pendente[]) {
    try {
      const score = await classificar(item.texto, token);
      const flagged = score >= LIMIAR;
      const { error: e } = await db.rpc("tybyria_registrar", {
        p_type: item.target_type,
        p_id: item.target_id,
        p_score: score,
        p_flagged: flagged,
      });
      if (e) throw e;
      checados++;
      if (flagged) sinalizados++;
    } catch (err) {
      console.error("tybyria-check: falhou num item", item.target_type, item.target_id, err);
      // Segue pro próximo; este item continua pendente e é tentado de novo no próximo cron.
    }
  }
  return json(200, { checados, sinalizados });
});
