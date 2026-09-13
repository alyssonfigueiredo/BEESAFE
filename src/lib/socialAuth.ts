import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

const redirectTo = Linking.createURL("auth/callback"); // irisa://auth/callback

/** Google via OAuth da Supabase no navegador do sistema (PKCE). */
export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw error ?? new Error("Não foi possível iniciar o login com Google.");

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return; // usuário cancelou

  const url = new URL(result.url);
  const code = url.searchParams.get("code");
  const errorDescription = url.searchParams.get("error_description");
  if (errorDescription) throw new Error(errorDescription);
  if (!code) throw new Error("Resposta do Google sem código de autorização.");

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

/** Apple nativo (só iOS). Nonce protege contra replay do identity token. */
export async function signInWithApple(): Promise<void> {
  if (Platform.OS !== "ios") throw new Error("Login com Apple só está disponível no iPhone.");
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hashedNonce,
  });
  if (!credential.identityToken) throw new Error("Apple não devolveu o token de identidade.");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  return AppleAuthentication.isAvailableAsync();
}
