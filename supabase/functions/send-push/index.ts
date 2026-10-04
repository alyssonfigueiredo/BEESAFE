// Notificações push pela API do Expo (migration 38).
// Chamada pelo pg_cron de 5 em 5 minutos quando há envio vencido e na hora por enviar_notificacao().
// Pega os envios vencidos de public.push_envios, manda para os tokens de public.push_tokens
// (todo mundo ou só quem tem a cidade no perfil), grava quantos foram aceitos e apaga os tokens
// de aparelho que desinstalou o app ou tirou a permissão (DeviceNotRegistered).
// Secrets: SB_SECRET_KEY (já existe). Opcional: EXPO_ACCESS_TOKEN, se a segurança de push do Expo for ligada.
// A senha do cron fica só no Vault (push_secret) e é conferida pela RPC push_autorizado.
import { adminClient, json } from "../_shared/supabase.ts";

const EXPO_URL = "https://exp.host/--/api/v2/push/send";
const LOTE = 100; // máximo por requisição na API do Expo

type Envio = {
  id: number;
  titulo: string;
  corpo: string;
  url: string | null;
  city_id: number | null;
};

type Ticket = { status: "ok" | "error"; message?: string; details?: { error?: string } };

async function mandarLote(tokens: string[], envio: Envio): Promise<Ticket[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const expoToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (expoToken) headers.Authorization = `Bearer ${expoToken}`;

  const mensagens = tokens.map((to) => ({
    to,
    title: envio.titulo,
    body: envio.corpo,
    sound: "default",
    channelId: "default",
    data: envio.url ? { url: envio.url } : {},
  }));
  const res = await fetch(EXPO_URL, { method: "POST", headers, body: JSON.stringify(mensagens) });
  const corpo = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(corpo?.data)) {
    const detalhe = corpo?.errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Expo recusou o lote: ${detalhe}`);
  }
  return corpo.data as Ticket[];
}

Deno.serve(async (req) => {
  const db = adminClient();
  const { data: ok } = await db.rpc("push_autorizado", {
    p_secret: req.headers.get("x-cron-secret") ?? "",
  });
  if (!ok) return json(401, { error: "não autorizado" });

  const { data: envios, error } = await db.rpc("push_pegar_envios");
  if (error) return json(500, { error: error.message });

  const resumo: unknown[] = [];
  for (const envio of (envios ?? []) as Envio[]) {
    try {
      const { data: linhas, error: e } = await db.rpc("push_tokens_do_envio", {
        p_city: envio.city_id,
      });
      if (e) throw new Error(e.message);
      const tokens = ((linhas ?? []) as { token: string }[]).map((l) => l.token);

      let aceitos = 0;
      let falhas = 0;
      const mortos: string[] = [];
      for (let i = 0; i < tokens.length; i += LOTE) {
        const lote = tokens.slice(i, i + LOTE);
        const tickets = await mandarLote(lote, envio);
        tickets.forEach((t, j) => {
          if (t.status === "ok") aceitos++;
          else {
            falhas++;
            if (t.details?.error === "DeviceNotRegistered") mortos.push(lote[j]);
          }
        });
      }
      if (mortos.length) await db.from("push_tokens").delete().in("token", mortos);

      await db
        .from("push_envios")
        .update({
          status: "enviada",
          aparelhos: tokens.length,
          aceitos,
          falhas,
          enviado_em: new Date().toISOString(),
        })
        .eq("id", envio.id);
      resumo.push({ id: envio.id, aparelhos: tokens.length, aceitos, falhas });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db.from("push_envios").update({ status: "erro", erro: msg }).eq("id", envio.id);
      resumo.push({ id: envio.id, erro: msg });
    }
  }
  return json(200, { envios: resumo });
});
