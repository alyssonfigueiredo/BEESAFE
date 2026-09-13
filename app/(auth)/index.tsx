import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { isAppleSignInAvailable, signInWithApple, signInWithGoogle } from "@/lib/socialAuth";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/cancel/i.test(msg)) Alert.alert("Não deu certo", msg);
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail() {
    if (!email || !password) return Alert.alert("Preencha e-mail e senha.");
    await run(async () => {
      const { error } =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (mode === "signup")
        Alert.alert("Cadastro criado", "Se pedirmos confirmação, confira seu e-mail.");
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-night px-6">
      <View className="flex-1 justify-center gap-6">
        <Logo size="lg" />
        <Text className="font-body text-base text-muted">
          Sua identidade nunca aparece. O cadastro existe só para evitar relatos falsos.
        </Text>

        <View className="gap-3">
          <Pressable
            disabled={busy}
            onPress={() => run(signInWithGoogle)}
            className="items-center rounded-xl bg-ink py-3 active:opacity-80 disabled:opacity-50"
          >
            <Text className="font-heading text-base uppercase tracking-widest text-night">
              Entrar com Google
            </Text>
          </Pressable>
          {appleAvailable && Platform.OS === "ios" && (
            <Pressable
              disabled={busy}
              onPress={() => run(signInWithApple)}
              className="items-center rounded-xl border border-ink py-3 active:opacity-80 disabled:opacity-50"
            >
              <Text className="font-heading text-base uppercase tracking-widest text-ink">
                Entrar com Apple
              </Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text className="font-body text-xs uppercase tracking-widest text-dim">
            ou com e-mail
          </Text>
          <View className="h-px flex-1 bg-border" />
        </View>

        <View className="gap-3">
          <TextInput
            className="rounded-xl border border-border bg-surface px-4 py-3 font-body text-base text-ink"
            placeholder="E-mail"
            placeholderTextColor={colors.dim}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            className="rounded-xl border border-border bg-surface px-4 py-3 font-body text-base text-ink"
            placeholder="Senha"
            placeholderTextColor={colors.dim}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            disabled={busy}
            onPress={submitEmail}
            className="items-center rounded-xl bg-coral py-3 active:opacity-80 disabled:opacity-50"
          >
            <Text className="font-heading text-lg uppercase tracking-widest text-night">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")}>
          <Text className="text-center font-body text-sm text-turquoise">
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
