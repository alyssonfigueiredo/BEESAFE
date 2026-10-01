// Exclusão de conta pelo próprio usuário. Se a conta entrou com a Apple e temos o refresh token,
// revoga na Apple ANTES de apagar (regra 5.1.1). Só então apaga o usuário do auth: o resto
// (relatos, mensagens e avaliações ficam anonimizados com user_id/created_by nulo; curtidas e
// fotos enviadas são apagadas) acontece pelas FKs, igual ao delete_my_account do SQL.
// Os arquivos das fotos (bucket fotos-lugares, <place_id>/<user_id>/foto.jpg) o banco não apaga
// sozinho: removemos aqui antes do deleteUser.
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

  await removePhotoFiles(admin, user.id);

  const { error: delError } = await admin.auth.admin.deleteUser(user.id);
  if (delError) return json(500, { error: delError.message });
  return json(200, { deleted: true, appleRevoked });
});

// Remove os arquivos de foto da pessoa. Falha aqui não impede a exclusão da conta: só registra.
async function removePhotoFiles(admin: ReturnType<typeof adminClient>, uid: string) {
  try {
    const bucket = admin.storage.from("fotos-lugares");
    const paths: string[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data: places, error } = await bucket.list("", { limit: 100, offset });
      if (error) throw error;
      if (!places || places.length === 0) break;
      for (const place of places) {
        if (place.id) continue; // arquivo solto na raiz, não é pasta de lugar
        const { data: files, error: e2 } = await bucket.list(`${place.name}/${uid}`, { limit: 100 });
        if (e2) {
          console.error("delete-account: listar fotos falhou", place.name, e2.message);
          continue;
        }
        for (const f of files ?? []) paths.push(`${place.name}/${uid}/${f.name}`);
      }
      if (places.length < 100) break;
    }
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await bucket.remove(paths.slice(i, i + 100));
      if (error) console.error("delete-account: remover fotos falhou", error.message);
    }
  } catch (e) {
    console.error("delete-account: limpeza das fotos falhou", e);
  }
}
