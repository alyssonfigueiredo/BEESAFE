/**
 * Mensagens de erro de login, cadastro e perfil em português, no lugar do texto em inglês da
 * Supabase ou da Apple. Devolve null quando a pessoa só cancelou (não mostra alerta).
 */
export function authMessage(e: unknown): string | null {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  const code = (e as { code?: string } | null)?.code ?? "";
  const m = raw.toLowerCase();

  if (code === "ERR_REQUEST_CANCELED" || code === "ERR_CANCELED" || /cancel/.test(m)) return null;
  if (/invalid login credentials/.test(m)) return "E-mail ou senha não conferem.";
  if (/email not confirmed/.test(m))
    return "Falta confirmar o e-mail. Abra o link que mandamos e tente de novo.";
  if (/user already registered|already been registered/.test(m))
    return "Esse e-mail já tem conta. Toque em “Já tem conta? Entrar”.";
  if (/password should be at least|weak password|weak_password/.test(m))
    return "A senha precisa ter pelo menos 6 caracteres.";
  if (/unable to validate email|invalid email|email address .* is invalid/.test(m))
    return "Esse e-mail não parece válido.";
  if (/rate limit|too many requests|for security purposes/.test(m))
    return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
  if (/unacceptable audience|audience/.test(m))
    return "O login com Apple ainda não está liberado para esta versão do app. Use Google ou e-mail por enquanto.";
  if (/provider is not enabled|unsupported provider/.test(m))
    return "Esse tipo de login está desligado no servidor. Use outra forma de entrar.";
  if (/nonce/.test(m)) return "A Apple recusou a verificação. Tente de novo.";
  // AuthorizationError 1000: o app não tem a permissão "Sign in with Apple" no perfil de
  // provisionamento (acontece quando o bundle id muda e a capacidade não foi religada).
  if (code === "ERR_REQUEST_UNKNOWN" || /authorizationerror error 1000|error 1000/.test(m))
    return "O login com Apple não está liberado nesta versão do app. Use Google ou e-mail por enquanto.";
  if (/network request failed|fetch failed|network/.test(m))
    return "Sem conexão. Confira a internet e tente de novo.";
  if (/jwt expired|session.*expired|sessão expirou|not authenticated|não autenticado/.test(m))
    return "Sua sessão expirou. Saia e entre de novo.";
  return raw || "Tente de novo.";
}
