// Push das pílulas de acolhimento (migration 49). Chamada 1x por dia pelo pg_cron
// (comfort_pill_disparar). Para cada pessoa com token e sem pílula nos últimos
// `pilula_intervalo_dias` (app_settings), sorteia uma pílula (sem repetir até esgotar o banco) e
// manda uma notificação individual — cada uma com uma frase diferente, não um broadcast igual
// para todo mundo. Mesmo secret do send-push (x-cron-secret / push_autorizado).
import { adminClient, json } from "../_shared/supabase.ts";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const LOTE = 100;

type Elegivel = { user_id: string; token: string };
type Pilula = { id: number; line1: string; line2: string; body: string };
type Ticket = { status: "ok" | "error"; message?: string; details?: { error?: string } };

async function mandarLote(
  itens: { token: string; pilula: Pilula }[],
): Promise<{ tickets: Ticket[]; tokens: string[] }> {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  const mensagens = itens.map(({ token, pilula }) => ({
    to: token,
    title: "Uma pílula de acolhimento 🌈",
    body: `${pilula.line1} ${pilula.line2}`,
    sound: "default",
    channelId: "default",
    data: { url: "/pilulas", pilula: pilula.id },
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

  const { data: settings } = await db.from("app_settings").select("value").eq("key", "pilula_intervalo_dias").maybeSingle();
  const intervalo = typeof settings?.value === "number" ? settings.value : 4;

  const { data: elegiveis, error } = await db.rpc("comfort_pill_push_eligible", { p_intervalo_dias: intervalo });
  if (error) return json(500, { error: error.message });

  const lista = (elegiveis ?? []) as Elegivel[];
  let enviados = 0;
  let falhas = 0;
  const mortos: string[] = [];
  const pendentes: { token: string; pilula: Pilula }[] = [];

  for (const pessoa of lista) {
    const { data: pilulas, error: e } = await db.rpc("next_comfort_pill_for", { p_user: pessoa.user_id });
    if (e || !pilulas?.length) continue; // banco de pílulas vazio: segue sem mandar pra essa pessoa
    pendentes.push({ token: pessoa.token, pilula: pilulas[0] as Pilula });
  }

  for (let i = 0; i < pendentes.length; i += LOTE) {
    const lote = pendentes.slice(i, i + LOTE);
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
      console.error("comfort-pill-push: lote falhou", err);
    }
  }
  if (mortos.length) await db.from("push_tokens").delete().in("token", mortos);

  return json(200, { elegiveis: lista.length, enviados, falhas });
});
