// Cliente mínimo da API de tokens da Apple (Sign in with Apple), sem dependências.
// Docs: https://developer.apple.com/documentation/sign_in_with_apple/generate_and_validate_tokens
//       https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens

const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";

export type AppleConfig = { teamId: string; keyId: string; privateKeyPem: string };

export function appleConfigFromEnv(): AppleConfig {
  const teamId = Deno.env.get("APPLE_TEAM_ID");
  const keyId = Deno.env.get("APPLE_KEY_ID");
  const privateKeyPem = Deno.env.get("APPLE_PRIVATE_KEY");
  if (!teamId || !keyId || !privateKeyPem) {
    throw new Error("Faltam APPLE_TEAM_ID, APPLE_KEY_ID ou APPLE_PRIVATE_KEY nos secrets da função.");
  }
  return { teamId, keyId, privateKeyPem };
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToDer(pem: string): Uint8Array {
  const body = pem
    .replace(/\\n/g, "\n") // secret colado com \n literal
    .replace(/-----(BEGIN|END)[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** client_secret exigido pela Apple: JWT ES256 assinado com a chave .p8, válido por até 6 meses (usamos 10 min). */
export async function makeClientSecret(cfg: AppleConfig, clientId: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(cfg.privateKeyPem),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: "ES256", kid: cfg.keyId })));
  const payload = b64url(
    enc.encode(
      JSON.stringify({
        iss: cfg.teamId,
        iat: now,
        exp: now + 600,
        aud: "https://appleid.apple.com",
        sub: clientId,
      }),
    ),
  );
  const data = `${header}.${payload}`;
  // WebCrypto devolve r||s (64 bytes), que é exatamente o formato JWS do ES256.
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(data));
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

async function post(url: string, form: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  });
}

/** Troca o authorization code do login (vale 5 min) pelo refresh token. */
export async function exchangeCode(
  cfg: AppleConfig,
  clientId: string,
  code: string,
): Promise<{ refresh_token: string; access_token?: string; id_token?: string }> {
  const res = await post(APPLE_TOKEN_URL, {
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: await makeClientSecret(cfg, clientId),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.refresh_token) {
    throw new Error(`Apple recusou a troca do código: ${res.status} ${body.error ?? ""} ${body.error_description ?? ""}`.trim());
  }
  return body;
}

/** Revoga o refresh token na Apple. Sucesso = 200. */
export async function revokeToken(cfg: AppleConfig, clientId: string, refreshToken: string): Promise<void> {
  const res = await post(APPLE_REVOKE_URL, {
    client_id: clientId,
    client_secret: await makeClientSecret(cfg, clientId),
    token: refreshToken,
    token_type_hint: "refresh_token",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Apple não revogou o token: ${res.status} ${body.error ?? ""} ${body.error_description ?? ""}`.trim());
  }
}
