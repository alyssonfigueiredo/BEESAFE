// Olha a foto que alguém mandou ANTES de ela aparecer na ficha do lugar.
// Chamada pelo pg_cron de 5 em 5 minutos (migration 24), só quando há foto pendente.
//
// Usa o SafeSearch do Google Cloud Vision (1.000 análises por mês de graça). Ele devolve, para
// adulto, violência, sensual e médico, uma escala de VERY_UNLIKELY a VERY_LIKELY:
//   tudo baixo                     → aprovada, entra no ar
//   qualquer coisa LIKELY ou acima → recusada, não entra
//   POSSIBLE                       → 'humano': fila da tela de moderação
// Sem VISION_API_KEY, nada é aprovado sozinho: tudo cai na fila humana. O silêncio é seguro.
//
// Secrets: PHOTO_CHECK_SECRET (o mesmo no Vault como photo_check_secret), SB_SECRET_KEY,
// VISION_API_KEY (chave do Google Cloud com a Cloud Vision API ativada).
import { adminClient, json } from "../_shared/supabase.ts";

type Nivel = "UNKNOWN" | "VERY_UNLIKELY" | "UNLIKELY" | "POSSIBLE" | "LIKELY" | "VERY_LIKELY";

// 'medical' fica de fora de propósito: foto de farmácia ou de serviço de saúde cai nele, e
// recusar isso num app que lista serviço de apoio seria errado.
const CATEGORIAS = ["adult", "violence", "racy"] as const;
const RECUSA: Nivel[] = ["LIKELY", "VERY_LIKELY"];
const DUVIDA: Nivel[] = ["POSSIBLE"];

Deno.serve(async (req) => {
  const secret = Deno.env.get("PHOTO_CHECK_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json(401, { error: "não autorizado" });

  const admin = adminClient();
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
      } else if (niveis.some((n) => DUVIDA.includes(n) || n === "UNKNOWN")) {
        review = "humano";
        contagem.humano++;
      } else {
        review = "aprovada";
        contagem.aprovadas++;
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

  return json(200, contagem);
});
