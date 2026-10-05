// Push semanal personalizado (migration 63). Chamado 1x por semana pelo pg_cron
// (push_nudge_disparar). Pra cada pessoa com token, push_nudges_semanais() já decidiu o único
// aviso da rodada (nível perto de subir, medalha quase pronta, ou um lugar sem nota na cidade do
// perfil) — esta função só manda pelo Expo, igual ao send-push e ao comfort-pill-push.
import { adminClient, json } from "../_shared/supabase.ts";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const LOTE = 100;

type Candidato = { user_id: string; token: string; titulo: string; corpo: string; url: string };
type Ticket = { status: "ok" | "error"; message?: string; details?: { error?: string } };

async function mandarLote(itens: Candidato[]): Promise<{ tickets: Ticket[]; tokens: string[] }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  const mensagens = itens.map((c) => ({
    to: c.token,
    title: c.titulo,
    body: c.corpo,
    sound: "default",
    channelId: "default",
    data: { url: c.url },
  }));
  const res = await fetch(EXPO_URL, { method: "POST", headers, body: JSON.stringify(mensagens) });
  const corpo = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(corpo?.data)) {
    const detalhe = corpo?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Expo recusou o lote: ${detalhe}`);
  }
  return { tickets: corpo.data as Ticket[], tokens: itens.map((i) => i.token) };
}

Deno.serve(async (req) => {
  const db = adminClient();
  const { data: ok } = await db.rpc("push_autorizado", {
    p_secret: req.headers.get("x-cron-secret") ?? "",
  });
  if (!ok) return json(401, { error: "não autorizado" });

  const { data: candidatos, error } = await db.rpc("push_nudges_semanais");
  if (error) return json(500, { error: error.message });

  const lista = ((candidatos ?? []) as Candidato[]).filter((c) => c.titulo && c.corpo);
  let enviados = 0;
  let falhas = 0;
  const mortos: string[] = [];

  for (let i = 0; i < lista.length; i += LOTE) {
    const lote = lista.slice(i, i + LOTE);
    try {
      const { tickets, tokens } = await mandarLote(lote);
      tickets.forEach((t, j) => {
        if (t.status === "ok") enviados++;
        else {
          falhas++;
          if (t.details?.error === "DeviceNotRegistered") mortos.push(tokens[j]);
        }
      });
    } catch (err) {
      falhas += lote.length;
      console.error("weekly-nudge: lote falhou", err);
    }
  }
  if (mortos.length) await db.from("push_tokens").delete().in("token", mortos);

  return json(200, { candidatos: lista.length, enviados, falhas });
});
