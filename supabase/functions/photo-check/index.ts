// Olha a foto que alguém mandou ANTES de ela aparecer na ficha do lugar.
// Chamada pelo pg_cron de 5 em 5 minutos (migration 24), só quando há foto pendente.
//
// Usa o SafeSearch do Google Cloud Vision (1.000 análises por mês de graça). Ele devolve, para
// adulto, violência, sensual e médico, uma escala de VERY_UNLIKELY a VERY_LIKELY:
//   as três em VERY_UNLIKELY       → aprovada, entra no ar
//   qualquer coisa LIKELY ou acima → recusada, não entra (segue visível na fila para conferir)
//   qualquer outra resposta        → 'humano': fila da tela de moderação
// Regra do Alysson: qualquer sinal de dúvida (até UNLIKELY) passa por uma pessoa.
// Sem VISION_API_KEY, nada é aprovado sozinho: tudo cai na fila humana. O silêncio é seguro.
// Quando alguma foto cai na fila, manda um e-mail pelo Gmail da Irisa (MODERACAO_EMAIL, ou o
// próprio GMAIL_USER) avisando que tem foto para aprovar.
//
// O cron manda a chave guardada no Vault (photo_check_secret, migration 26) e a função confere
// pela RPC photo_check_autorizado. Secrets: SB_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD;
// opcionais VISION_API_KEY (chave do Google Cloud com a Cloud Vision API) e MODERACAO_EMAIL.
import nodemailer from "npm:nodemailer@6";
import { adminClient, json } from "../_shared/supabase.ts";

type Nivel = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";

// 'medical' fica de fora de propósito: foto de farmácia ou de serviço de saúde cai nele, e
// recusar isso num app que lista serviço de apoio seria errado.
const CATEGORIAS = ["adult", "violence", "racy"] as const;
const RECUSA: Nivel[] = ["LIKELY", "VERY_LIKELY"];
// Só isto aprova sozinho. UNLIKELY, POSSIBLE e UNKNOWN já são dúvida.
const LIMPA: Nivel = "VERY_UNLIKELY";

// Falha no e-mail nunca desfaz a análise: a foto já está na fila e aparece na tela de Moderação.
async function avisarModeracao(admin: ReturnType<typeof adminClient>, novas: number) {
  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !pass || novas === 0) return;
  const { count } = await admin
    .from("place_photos")
    .select("id", { count: "exact", head: true })
    .in("review", ["humano", "recusada"]);
  const total = count ?? novas;
  const smtp = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  try {
    await smtp.sendMail({
      from: `Irisa <${user}>`,
      to: Deno.env.get("MODERACAO_EMAIL") ?? user,
      subject: novas === 1 ? "Irisa: 1 foto nova para aprovar" : `Irisa: ${novas} fotos novas para aprovar`,
      text:
        `Chegaram ${novas} foto(s) de lugar esperando sua decisão (${total} na fila no total).\n\n` +
        "Abra a Irisa → Perfil → Moderação para liberar ou recusar.\n" +
        "Nenhuma delas aparece na ficha do lugar antes disso.",
    });
  } catch (e) {
    console.error("photo-check: e-mail de aviso falhou", e);
  } finally {
    smtp.close();
  }
}

Deno.serve(async (req) => {
  const admin = adminClient();
  const { data: autorizado } = await admin.rpc("photo_check_autorizado", {
    p_secret: req.headers.get("x-cron-secret") ?? "",
  });
  if (autorizado !== true) return json(401, { error: "não autorizado" });

  const { data: pendentes, error } = await admin
    .from("place_photos")
    .select("id, url")
    .eq("review", "pendente")
    .order("created_at")
    .limit(20);
  if (error) return json(500, { error: error.message });
  if (!pendentes?.length) return json(200, { analisadas: 0 });

  const vision = Deno.env.get("VISION_API_KEY");
  if (!vision) {
    // Sem robô, a fila é humana: marca para aparecer na tela de moderação e não publica nada.
    const ids = pendentes.map((f) => f.id);
    await admin
      .from("place_photos")
      .update({ review: "humano", review_note: "sem VISION_API_KEY: fila humana" })
      .in("id", ids);
    await avisarModeracao(admin, ids.length);
    return json(200, { analisadas: 0, paraHumano: ids.length });
  }

  const contagem = { aprovadas: 0, recusadas: 0, humano: 0, erro: 0 };
  for (const foto of pendentes) {
    try {
      const r = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${vision}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { source: { imageUri: foto.url } },
              features: [{ type: "SAFE_SEARCH_DETECTION" }],
            },
          ],
        }),
      });
      const resposta = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(resposta.error?.message ?? `Vision ${r.status}`);
      const safe = resposta.responses?.[0]?.safeSearchAnnotation;
      if (!safe) throw new Error("sem resposta do SafeSearch");

      const notas = CATEGORIAS.map((c) => `${c}=${safe[c] ?? "UNKNOWN"}`).join(" ");
      const niveis = CATEGORIAS.map((c) => (safe[c] ?? "UNKNOWN") as Nivel);
      let review: string;
      if (niveis.some((n) => RECUSA.includes(n))) {
        review = "recusada";
        contagem.recusadas++;
      } else if (niveis.every((n) => n === LIMPA)) {
        review = "aprovada";
        contagem.aprovadas++;
      } else {
        review = "humano";
        contagem.humano++;
      }

      await admin
        .from("place_photos")
        .update({ review, review_note: notas, reviewed_at: new Date().toISOString() })
        .eq("id", foto.id);
    } catch (e) {
      contagem.erro++;
      console.error("photo-check:", foto.id, e);
      // Deu erro? Não aprova. Vai para a fila humana e alguém decide.
      await admin
        .from("place_photos")
        .update({ review: "humano", review_note: `erro: ${String(e).slice(0, 200)}` })
        .eq("id", foto.id);
    }
  }

  await avisarModeracao(admin, contagem.recusadas + contagem.humano + contagem.erro);
  return json(200, contagem);
});
