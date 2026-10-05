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

/**
 * Chave de API de terceiro (Groq, Gemini, Hugging Face…): primeiro tenta o secret da própria
 * função (Supabase → Edge Functions → Secrets), senão cai na que o painel admin gravou no Vault
 * (migration 54, admin_set_api_key) — assim dá pra configurar sem mexer no dashboard.
 */
export async function getApiKey(db: ReturnType<typeof adminClient>, name: string): Promise<string | null> {
  const direto = Deno.env.get(name);
  if (direto) return direto;
  const { data } = await db.rpc("get_secret_for_function", { p_name: name });
  return (data as string | null) ?? null;
}
