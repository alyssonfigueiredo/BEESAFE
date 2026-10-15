import { supabase } from "@/lib/supabase";

export type AppEventKind = "abriu" | "avaliou" | "cadastrou_lugar" | "relatou" | "erro";

/**
 * Evento mínimo de produto (migration 81): só "aconteceu algo", nunca o quê — sem texto livre,
 * sem lugar/relato ligado. Dispara e esquece: nunca deve travar nem aparecer pra quem usa o app.
 */
export function logEvent(kind: AppEventKind) {
  void supabase
    .from("app_events")
    .insert({ kind })
    .then(({ error }) => {
      if (error) console.warn("logEvent falhou:", kind, error.message);
    });
}
