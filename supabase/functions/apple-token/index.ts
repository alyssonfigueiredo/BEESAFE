// Chamada pelo app logo depois do "Entrar com a Apple": recebe o authorization code do login,
// troca pelo refresh token na Apple e guarda em public.apple_refresh_tokens. Sem isso não há
// como revogar o vínculo quando a pessoa excluir a conta (regra 5.1.1 da App Store).
import { appleConfigFromEnv, exchangeCode } from "../_shared/apple.ts";
import { adminClient, hasAppleIdentity, json, userFromRequest } from "../_shared/supabase.ts";

const DEFAULT_CLIENT_ID = "br.com.irisa.ios";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(204, {});
  if (req.method !== "POST") return json(405, { error: "método inválido" });

  const user = await userFromRequest(req);
  if (!user) return json(401, { error: "não autenticado" });
  if (!hasAppleIdentity(user)) return json(400, { error: "conta sem login da Apple" });

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code : "";
  if (!code) return json(400, { error: "code obrigatório" });
  // O bundle id do app é o client_id do login nativo. O secret APPLE_CLIENT_ID manda; senão vale
  // o que o app informa (a Apple só aceita se a chave .p8 for do mesmo time desse App ID).
  const clientId =
    Deno.env.get("APPLE_CLIENT_ID") ??
    (typeof body.clientId === "string" && /^[\w.-]{3,100}$/.test(body.clientId) ? body.clientId : DEFAULT_CLIENT_ID);

  try {
    const tokens = await exchangeCode(appleConfigFromEnv(), clientId, code);
    const { error } = await adminClient()
      .from("apple_refresh_tokens")
      .upsert({ user_id: user.id, client_id: clientId, refresh_token: tokens.refresh_token, updated_at: new Date().toISOString() });
    if (error) throw error;
    return json(200, { stored: true });
  } catch (e) {
    console.error("apple-token", e);
    return json(502, { error: e instanceof Error ? e.message : String(e) });
  }
});
