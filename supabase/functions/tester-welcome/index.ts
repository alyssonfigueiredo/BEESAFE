// E-mail de boas-vindas para quem se inscreveu no teste pelo site (tabela tester_signups).
// Chamada a cada 10 minutos pelo pg_cron (migration 22). Manda para quem já foi colado na lista
// de testadores (added_at preenchido) e ainda não recebeu (welcomed_at vazio), e marca welcomed_at.
// Envia pelo Gmail da Irisa por SMTP na porta 465 (as Edge Functions bloqueiam 25 e 587).
// Secrets: TESTER_WELCOME_SECRET, GMAIL_USER, GMAIL_APP_PASSWORD, SB_SECRET_KEY; opcional TESTFLIGHT_URL.
import nodemailer from "npm:nodemailer@6";
import { createClient } from "npm:@supabase/supabase-js@2";

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Faltam SUPABASE_URL ou SB_SECRET_KEY nos secrets da função.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

// Primeiro o de participação (vira testador), depois o da loja (só abre para quem já é testador).
const PLAY_TEST_URL = "https://play.google.com/apps/testing/br.com.irisa.app";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=br.com.irisa.app";
const APP_STORE_URL = "https://apps.apple.com/br/app/irisa/id6816761128";
// Embutida em base64 (não é URL externa): nem raw.githubusercontent.com nem jsDelivr carregavam no
// proxy de imagem de alguns Gmail — assim o logo viaja dentro do próprio e-mail, sem depender de
// buscar nada de fora. Gerada de docs/marca-pack/irisa-horizontal-ink.png (567×224).
const LOGO_DATA_URI = "data:image/png;base64,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";

// E-mail em HTML (tabela + CSS inline) nas cores reais da marca (papel, cápsulas coral/turquesa).
// Alguns celulares (modo escuro forçado pelo Android/Gmail em cima de qualquer e-mail, sem respeitar
// o que o HTML pede) mostram isso com as cores trocadas — é do aparelho de quem abre, não do e-mail:
// quem não tem essa opção vê certo. Travas de robustez (bgcolor, !important) ajudam nos clientes que
// respeitam color-scheme, mas não existe truque de HTML que vença uma inversão forçada pelo sistema.
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
        `<tr><td style="padding:4px 0;font-size:15px;line-height:1.5;color:#3D4560 !important;font-family:Arial,Helvetica,sans-serif;"><b style="color:#141829 !important;">${i + 1}.</b> ${p}</td></tr>`,
    )
    .join("");
  const ctas = opts.ctas
    .map(
      (c) =>
        `<tr><td style="padding:10px 0;text-align:center;"><table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr><td bgcolor="${c.cor}" style="background:${c.cor};border-radius:999px;"><a href="${c.url}" style="display:block;padding:14px 30px;color:${c.tinta} !important;text-decoration:none;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;">${c.texto}</a></td></tr></table></td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"></head>
<body style="margin:0;padding:0;background:#F5F4F1 !important;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#F5F4F1" style="background:#F5F4F1 !important;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="100%" bgcolor="#FFFFFF" style="max-width:480px;background:#FFFFFF !important;border-radius:24px;overflow:hidden;">
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF !important;padding:36px 32px 4px;text-align:center;">
<img src="${LOGO_DATA_URI}" width="150" height="59" alt="Irisa" style="display:block;margin:0 auto;border:0;">
</td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF !important;padding:20px 32px 0;text-align:center;">
<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;letter-spacing:.02em;color:#141829 !important;text-transform:uppercase;">${opts.titulo}</p>
<p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#3D4560 !important;">${opts.corpo}</p>
</td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF !important;padding:0 32px;">
<table role="presentation" width="100%" bgcolor="#F5F4F1" style="background:#F5F4F1 !important;border-radius:16px;padding:18px 20px;"><tbody>${passos}</tbody></table>
</td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF !important;padding:16px 32px 0;"><table role="presentation" width="100%"><tbody>${ctas}</tbody></table></td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF !important;padding:18px 32px 0;">
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#7C8296 !important;">${opts.nota}</p>
</td></tr>
<tr><td bgcolor="#FFFFFF" style="background:#FFFFFF !important;padding:28px 32px 34px;text-align:center;border-top:1px solid #ECEAE5;margin-top:10px;">
<p style="margin:20px 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7C8296 !important;">O mapa dos lugares onde a gente é bem-vinde, feito por nós.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#141829 !important;">@appirisa</p>
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

function iosEmail(testflightUrl?: string) {
  if (testflightUrl) {
    return {
      subject: “Você está no teste da Irisa no iPhone”,
      text: [
        “Oi! A Irisa já pode ser testada no iPhone. Bem-vinde.”,
        “”,
        “1. Instale o app TestFlight da App Store.”,
        “2. Abra este link no iPhone:”,
        testflightUrl,
        “3. Toque em \”Aceitar\” e depois em \”Instalar\”.”,
        “”,
        “Conte o que achou respondendo este e-mail.”,
        “”,
        “Irisa · o mapa dos lugares onde a gente é bem-vinde, feito por nós”,
        “@appirisa”,
      ].join(“\n”),
      html: wrapHtml({
        titulo: “Você está no teste da Irisa no iPhone”,
        corpo: “Oi! A Irisa já pode ser testada no iPhone. Bem-vinde.”,
        passos: [
          “Instale o app <b>TestFlight</b> da App Store.”,
          “Abra o link abaixo no iPhone e toque em “Aceitar” e depois em “Instalar”.”,
        ],
        ctas: [{ texto: “Abrir no TestFlight”, url: testflightUrl, cor: “#FF6964”, tinta: “#FFFFFF” }],
        nota: “Conte o que achou respondendo este e-mail.”,
      }),
    };
  }
  return {
    subject: “A Irisa está na App Store!”,
    text: [
      “Oi! A Irisa já está disponível na App Store. Você pediu para ser avisade — chegou a hora. Bem-vinde.”,
      “”,
      “1. Abra o link abaixo no iPhone e toque em \”Obter\”.”,
      APP_STORE_URL,
      “”,
      “Conte o que achou respondendo este e-mail.”,
      “”,
      “Irisa · o mapa dos lugares onde a gente é bem-vinde, feito por nós”,
      “@appirisa”,
    ].join(“\n”),
    html: wrapHtml({
      titulo: “A Irisa está na App Store!”,
      corpo: “Oi! A Irisa já está disponível na App Store. Você pediu para ser avisade — chegou a hora. Bem-vinde.”,
      passos: [
        “Abra o link abaixo no iPhone e toque em <b>”Obter”</b> para instalar.”,
      ],
      ctas: [{ texto: “Baixar na App Store”, url: APP_STORE_URL, cor: “#FF6964”, tinta: “#FFFFFF” }],
      nota: “Conte o que achou respondendo este e-mail.”,
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
  // iOS: envia sempre (App Store pública); TESTFLIGHT_URL é só para quem quer o e-mail de TestFlight.
  // Android: sempre envia.
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
    const mail = row.platform === "ios" ? iosEmail(testflight) : androidEmail();
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
