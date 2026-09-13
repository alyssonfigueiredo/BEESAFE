import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabase";
import { colors } from "@/theme/tokens";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password) return Alert.alert("Preencha e-mail e senha.");
    setBusy(true);
    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) Alert.alert("Não deu certo", error.message);
    else if (mode === "signup")
      Alert.alert("Cadastro criado", "Confira seu e-mail para confirmar a conta.");
  }

  return (
    <SafeAreaView className="flex-1 bg-night px-6">
      <View className="flex-1 justify-center gap-6">
        <Logo size="lg" />
        <Text className="font-body text-base text-muted">
          Sua identidade nunca aparece. O cadastro existe só para evitar relatos falsos.
        </Text>

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
            onPress={submit}
            className="items-center rounded-xl bg-coral py-3 active:opacity-80"
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

        <Text className="text-center font-body text-xs text-dim">
          Login com Google e Apple entram na fase 1.
        </Text>
      </View>
    </SafeAreaView>
  );
}
