import { createClient, type User } from "npm:@supabase/supabase-js@2";

/**
 * Cliente com a chave de serviço (sb_secret_...). As chaves legadas do projeto estão desativadas,
 * então a SUPABASE_SERVICE_ROLE_KEY injetada automaticamente não serve: o secret SB_SECRET_KEY
 * tem que ser definido na mão (supabase/README.md).
 */
export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SB_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Faltam SUPABASE_URL ou SB_SECRET_KEY nos secrets da função.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Usuário dono do JWT que veio no Authorization; null se não houver sessão válida. */
export async function userFromRequest(req: Request): Promise<User | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const jwt = auth.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await adminClient().auth.getUser(jwt);
  if (error) return null;
  return data.user;
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

export function hasAppleIdentity(user: User): boolean {
  return (user.identities ?? []).some((i) => i.provider === "apple");
}
