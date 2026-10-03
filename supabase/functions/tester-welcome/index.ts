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
const LOGO_URL =
  "https://raw.githubusercontent.com/alyssonfigueiredo/BEESAFE/claude/ecstatic-darwin-cmf7sw/docs/marca-pack/irisa-horizontal-ink.png";

// E-mail em HTML (tabela + CSS inline, do jeito que clientes de e-mail toleram) na mesma paleta
// do app e do Instagram (papel, cápsulas coral/turquesa), com o texto puro como alternativa pra
// quem não carrega HTML. `rows` é a lista de passos numerados; `cta` os botões em cápsula.
function wrapHtml(opts: {
  titulo: string;
  corpo: string;
  passos: string[];
  ctas: { texto: string; url: string; cor: string; tinta: string }[];
  nota: string;
}) {
  const passos = opts.passos
    .map(
      (p, i) =>
        `<tr><td style="padding:4px 0;font-size:15px;line-height:1.5;color:#3D4560;font-family:Arial,Helvetica,sans-serif;"><b style="color:#141829;">${i + 1}.</b> ${p}</td></tr>`,
    )
    .join("");
  const ctas = opts.ctas
    .map(
      (c) =>
        `<tr><td style="padding:10px 0;text-align:center;"><a href="${c.url}" style="display:inline-block;background:${c.cor};color:${c.tinta};text-decoration:none;font-weight:700;padding:14px 30px;border-radius:999px;font-size:15px;font-family:Arial,Helvetica,sans-serif;">${c.texto}</a></td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F5F4F1;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:24px;overflow:hidden;">
<tr><td style="padding:36px 32px 4px;text-align:center;">
<img src="${LOGO_URL}" width="150" alt="Irisa" style="display:block;margin:0 auto;border:0;">
</td></tr>
<tr><td style="padding:20px 32px 0;text-align:center;">
<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:.02em;color:#141829;text-transform:uppercase;">${opts.titulo}</p>
<p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#3D4560;">${opts.corpo}</p>
</td></tr>
<tr><td style="padding:0 32px;">
<table role="presentation" width="100%" style="background:#F5F4F1;border-radius:16px;padding:18px 20px;"><tbody>${passos}</tbody></table>
</td></tr>
<tr><td style="padding:16px 32px 0;"><table role="presentation" width="100%"><tbody>${ctas}</tbody></table></td></tr>
<tr><td style="padding:18px 32px 0;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#7C8296;">${opts.nota}</p>
</td></tr>
<tr><td style="padding:28px 32px 34px;text-align:center;border-top:1px solid #ECEAE5;margin-top:10px;">
<p style="margin:20px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7C8296;">O mapa dos lugares onde a gente é bem-vinde, feito por nós.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#141829;">@appirisa</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

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
    html: wrapHtml({
      titulo: "Você está no teste da Irisa",
      corpo: "Oi! Seu e-mail já está na lista de teste. Bem-vinde.",
      passos: [
        "Abra este link, no celular Android logado na mesma conta Google deste e-mail, e toque em <b>“Tornar-se testador”</b>.",
        "Depois abra a Irisa na Play Store e instale.",
      ],
      ctas: [
        { texto: "Tornar-se testador", url: PLAY_TEST_URL, cor: "#FF6964", tinta: "#FFFFFF" },
        { texto: "Abrir na Play Store", url: PLAY_STORE_URL, cor: "#49DCC0", tinta: "#141829" },
      ],
      nota: 'Se aparecer "app não encontrado", espere algumas horas — a Play Store pode demorar para liberar. Deixe o app instalado durante o teste e conte o que achou respondendo este e-mail.',
    }),
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
    html: wrapHtml({
      titulo: "Você está no teste da Irisa no iPhone",
      corpo: "Oi! A Irisa já pode ser testada no iPhone. Bem-vinde.",
      passos: [
        "Instale o app <b>TestFlight</b> da App Store.",
        "Abra o link abaixo no iPhone e toque em “Aceitar” e depois em “Instalar”.",
      ],
      ctas: [{ texto: "Abrir no TestFlight", url, cor: "#FF6964", tinta: "#FFFFFF" }],
      nota: "Conte o que achou respondendo este e-mail.",
    }),
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
      await smtp.sendMail({
        from: `Irisa <${user}>`,
        to: row.email,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
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
