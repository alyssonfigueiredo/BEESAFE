// E-mail de boas-vindas para quem se inscreveu no teste pelo site (tabela tester_signups).
// Chamada a cada 10 minutos pelo pg_cron (migration 22). Manda para quem já foi colado na lista
// de testadores (added_at preenchido) e ainda não recebeu (welcomed_at vazio), e marca welcomed_at.
// Envia pelo Gmail da Irisa por SMTP na porta 465 (as Edge Functions bloqueiam 25 e 587).
// Secrets: TESTER_WELCOME_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD, SB_SECRET_KEY; opcional TESTFLIGHT_URL.
import nodemailer from "npm:nodemailer@6";
import { adminClient, json } from "../_shared/supabase.ts";

// Primeiro o de participação (vira testador), depois o da loja (só abre para quem já é testador).
const PLAY_TEST_URL = "https://play.google.com/apps/testing/br.com.irisa.app";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=br.com.irisa.app";

function androidEmail() {
  return {
    subject: "Você está no teste da Irisa",
    text: [
      "Oi! Seu e-mail já está na lista de teste da Irisa. Bem-vinde.",
      "",
      "No celular Android, logado na mesma conta Google deste e-mail:",
      "",
      "1. Abra este link e toque em \"Tornar-se testador\":",
      PLAY_TEST_URL,
      "",
      "2. Depois abra a Irisa na Play Store e instale:",
      PLAY_STORE_URL,
      "",
      "Se aparecer \"app não encontrado\", espere algumas horas: a Play Store pode demorar para liberar.",
      "Deixe o app instalado durante o teste e conte o que achou respondendo este e-mail.",
      "",
      "Irisa · o mapa dos lugares onde a gente é bem-vinde, feito por nós",
      "@appirisa",
    ].join("\n"),
  };
}

function iosEmail(url: string) {
  return {
    subject: "Você está no teste da Irisa no iPhone",
    text: [
      "Oi! A Irisa já pode ser testada no iPhone. Bem-vinde.",
      "",
      "1. Instale o app TestFlight da App Store.",
      "2. Abra este link no iPhone:",
      url,
      "3. Toque em \"Aceitar\" e depois em \"Instalar\".",
      "",
      "Conte o que achou respondendo este e-mail.",
      "",
      "Irisa · o mapa dos lugares onde a gente é bem-vinde, feito por nós",
      "@appirisa",
    ].join("\n"),
  };
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("TESTER_WELCOME_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json(401, { error: "não autorizado" });

  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !pass) return json(500, { error: "Faltam GMAIL_USER ou GMAIL_APP_PASSWORD." });
  const testflight = Deno.env.get("TESTFLIGHT_URL");

  const admin = adminClient();
  let q = admin
    .from("tester_signups")
    .select("id, email, platform")
    .not("added_at", "is", null)
    .is("welcomed_at", null)
    .order("added_at")
    .limit(40);
  // Sem link público do TestFlight, quem é de iPhone espera (não marca como avisado).
  if (!testflight) q = q.eq("platform", "android");
  const { data: pending, error } = await q;
  if (error) return json(500, { error: error.message });
  if (!pending?.length) return json(200, { sent: 0 });

  const smtp = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  const sent: number[] = [];
  const failed: string[] = [];
  for (const row of pending) {
    const mail = row.platform === "ios" ? iosEmail(testflight!) : androidEmail();
    try {
      await smtp.sendMail({ from: `Irisa <${user}>`, to: row.email, subject: mail.subject, text: mail.text });
      sent.push(row.id);
    } catch (e) {
      console.error("tester-welcome: falhou", row.email, e);
      failed.push(row.email);
    }
  }
  smtp.close();

  if (sent.length) {
    const { error: upError } = await admin
      .from("tester_signups")
      .update({ welcomed_at: new Date().toISOString() })
      .in("id", sent);
    if (upError) return json(500, { error: upError.message, sent: sent.length });
  }
  return json(200, { sent: sent.length, failed });
});
