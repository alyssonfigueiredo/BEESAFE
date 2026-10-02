// Exclusão de conta pelo próprio usuário. Se a conta entrou com a Apple e temos o refresh token,
// revoga na Apple ANTES de apagar (regra 5.1.1). Só então apaga o usuário do auth: o resto
// (relatos e mensagens anonimizados, avaliações e curtidas apagadas) acontece pelas FKs, igual
// ao delete_my_account do SQL.
import { appleConfigFromEnv, revokeToken } from "../_shared/apple.ts";
import { adminClient, hasAppleIdentity, json, userFromRequest } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(204, {});
  if (req.method !== "POST") return json(405, { error: "método inválido" });

  const user = await userFromRequest(req);
  if (!user) return json(401, { error: "não autenticado" });
  const admin = adminClient();

  let appleRevoked = false;
  if (hasAppleIdentity(user)) {
    const { data, error } = await admin
      .from("apple_refresh_tokens")
      .select("client_id, refresh_token")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    if (data) {
      try {
        await revokeToken(appleConfigFromEnv(), data.client_id, data.refresh_token);
        appleRevoked = true;
      } catch (e) {
        console.error("delete-account: revogação Apple falhou", e);
        return json(502, {
          error: "Não foi possível desvincular sua conta Apple agora. Tente de novo em instantes.",
        });
      }
    }
    // Sem token guardado (login anterior a esta versão): não há o que revogar; a exclusão segue.
  }

  // A foto de perfil mora no Storage, que não some pelas FKs: apaga a pasta da pessoa antes.
  const { data: files } = await admin.storage.from("avatares").list(user.id);
  if (files?.length) {
    await admin.storage.from("avatares").remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) return json(500, { error: delError.message });
  return json(200, { deleted: true, appleRevoked });
});
