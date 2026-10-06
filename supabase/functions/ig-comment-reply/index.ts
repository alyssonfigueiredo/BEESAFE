// Resposta automática a comentário no Instagram (webhook da Graph API).
// GET  = handshake de verificação que a Meta manda ao salvar a URL do webhook.
// POST = evento de comentário novo: acha a primeira regra ativa de ig_reply_rules cujo gatilho
//        aparece no texto (sem acento, minúsculo) e responde pela Graph API. Nunca responde
//        comentário feito pela própria conta (o comentário fixado que o robô posta ao publicar).
// Secrets: META_ACCESS_TOKEN, META_IG_USER_ID (os mesmos do publicar-instagram.yml),
//          IG_WEBHOOK_VERIFY_TOKEN (qualquer string, só precisa bater com o que for colado no
//          painel da Meta), opcional META_APP_SECRET (assina o POST; sem ele a assinatura não é
//          conferida, mas a função funciona do mesmo jeito), SB_SECRET_KEY.
import { createClient } from "npm:@supabase/supabase-js@2";

const API = "https://graph.facebook.com/v21.0";
const TOKEN = Deno.env.get("META_ACCESS_TOKEN");
const IG_USER_ID = Deno.env.get("META_IG_USER_ID");
const VERIFY_TOKEN = Deno.env.get("IG_WEBHOOK_VERIFY_TOKEN");
const APP_SECRET = Deno.env.get("META_APP_SECRET");

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Faltam SUPABASE_URL ou SB_SECRET_KEY nos secrets da função.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function semAcento(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

async function assinaturaValida(req: Request, corpo: string) {
  if (!APP_SECRET) return true; // sem o secret configurado, não dá pra conferir — segue sem bloquear
  const assinatura = req.headers.get("x-hub-signature-256");
  if (!assinatura?.startsWith("sha256=")) return false;
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpo));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `sha256=${hex}` === assinatura;
}

async function responderComentario(commentId: string, mensagem: string) {
  const url = new URL(`${API}/${commentId}/replies`);
  const r = await fetch(url, {
    method: "POST",
    body: new URLSearchParams({ message: mensagem, access_token: TOKEN! }),
  });
  const j = await r.json();
  if (j.error) throw new Error(`responder ${commentId}: ${j.error.message}`);
  return j;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // handshake de verificação (a Meta chama isso uma vez, ao salvar a URL do webhook)
  if (req.method === "GET") {
    if (
      url.searchParams.get("hub.mode") === "subscribe" &&
      url.searchParams.get("hub.verify_token") === VERIFY_TOKEN
    ) {
      return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("verify_token não bate", { status: 403 });
  }

  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const corpo = await req.text();
  if (!(await assinaturaValida(req, corpo))) {
    return new Response("assinatura inválida", { status: 401 });
  }
  if (!TOKEN || !IG_USER_ID) {
    console.error("faltam META_ACCESS_TOKEN / META_IG_USER_ID nos secrets");
    return new Response("ok", { status: 200 }); // 200 pra Meta não ficar reenviando
  }

  let payload: any;
  try {
    payload = JSON.parse(corpo);
  } catch {
    return new Response("json inválido", { status: 400 });
  }

  const db = adminClient();
  const { data: regras } = await db
    .from("ig_reply_rules")
    .select("id, gatilho, resposta")
    .eq("ativo", true)
    .order("id", { ascending: true });

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "comments") continue;
      const v = change.value ?? {};
      const commentId: string | undefined = v.id;
      const texto: string = v.text ?? "";
      const autorId: string | undefined = v.from?.id;
      if (!commentId || autorId === IG_USER_ID) continue; // nunca responde comentário da própria conta

      const textoLimpo = semAcento(texto);
      const regra = (regras ?? []).find((r) => textoLimpo.includes(semAcento(r.gatilho)));
      if (!regra) continue;

      // já respondido? (a Meta pode reenviar o mesmo evento)
      const { data: ja } = await db
        .from("ig_auto_replies")
        .select("comment_id")
        .eq("comment_id", commentId)
        .maybeSingle();
      if (ja) continue;

      try {
        await responderComentario(commentId, regra.resposta);
        await db.from("ig_auto_replies").insert({
          comment_id: commentId,
          post_id: v.media?.id ?? null,
          texto_recebido: texto,
          regra_id: regra.id,
        });
      } catch (e) {
        console.error(String(e));
      }
    }
  }

  return new Response("ok", { status: 200 });
});
