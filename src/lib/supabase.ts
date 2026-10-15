import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "Supabase não configurado: defina EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no .env",
  );
}

// A sessão (access/refresh token) morava em AsyncStorage, sem criptografia — num app onde a conta
// pode denunciar violência sofrida, mover isso pro SecureStore (Keychain/Keystore do aparelho) é
// barato e coerente com a promessa de privacidade do resto do app (análise de ponta a ponta,
// 15/10/2026). expo-secure-store já é dependência do projeto, só não tinha uso nenhum até aqui.
// Quem já tinha sessão salva no AsyncStorage (de antes desta mudança) não pode cair deslogado no
// primeiro update: na primeira leitura, se não achar no SecureStore, procura no AsyncStorage,
// migra pra lá e apaga do lugar velho. Depois disso é tudo SecureStore.
const secureStoreAdapter = {
  getItem: async (key: string) => {
    const atual = await SecureStore.getItemAsync(key);
    if (atual != null) return atual;
    const antigo = await AsyncStorage.getItem(key);
    if (antigo != null) {
      await SecureStore.setItemAsync(key, antigo);
      await AsyncStorage.removeItem(key);
    }
    return antigo;
  },
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(url ?? "http://localhost:54321", anonKey ?? "anon", {
  auth: {
    storage: secureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// Mantém o token renovando só enquanto o app está em primeiro plano.
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
