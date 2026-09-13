import { Redirect } from "expo-router";

// Destino do deep link irisa://auth/callback. A troca do código acontece em socialAuth.ts;
// aqui só devolvemos o usuário para as tabs.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
