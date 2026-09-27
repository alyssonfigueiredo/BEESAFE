import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Logo } from "@/components/Logo";
import { authMessage } from "@/lib/authErrors";
import { isAppleSignInAvailable, signInWithApple, signInWithGoogle } from "@/lib/socialAuth";
import { supabase } from "@/lib/supabase";
import { colors, shadow } from "@/theme/tokens";

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
      const msg = authMessage(e);
      if (msg) Alert.alert("Não deu certo", msg);
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail() {
    const mail = email.trim().toLowerCase();
    if (!mail || !password) return Alert.alert("Preencha e-mail e senha.");
    if (mode === "signup" && password.length < 6)
      return Alert.alert("Senha curta", "A senha precisa ter pelo menos 6 caracteres.");
    await run(async () => {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) throw error;
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email: mail, password });
      if (error) throw error;
      // Com confirmação ligada, a Supabase devolve usuário sem sessão; com e-mail já usado,
      // devolve usuário sem identidades (para não revelar quem tem conta).
      if (data.user && data.user.identities?.length === 0)
        throw new Error("User already registered");
      if (!data.session) {
        Alert.alert(
          "Confira seu e-mail",
          "Mandamos um link para confirmar a conta. Depois de abrir o link, volte aqui e entre.",
        );
        setMode("login");
      }
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-paper px-6">
      <View className="flex-1 justify-center gap-6">
        <Logo size="lg" />
        <Text className="font-body text-base text-muted">
          Sua identidade nunca aparece. O cadastro existe só para evitar relatos falsos.
        </Text>

        <View className="gap-3">
          <Pressable
            disabled={busy}
            onPress={() => run(signInWithGoogle)}
            className="items-center rounded-full bg-ink py-3 active:opacity-80 disabled:opacity-50"
          >
            <Text className="font-body-bold text-base text-paper">Entrar com Google</Text>
          </Pressable>
          {appleAvailable && Platform.OS === "ios" && (
            <Pressable
              disabled={busy}
              onPress={() => run(signInWithApple)}
              className="items-center rounded-full bg-subtle py-3 active:opacity-80 disabled:opacity-50"
            >
              <Text className="font-body-bold text-base text-ink">Entrar com Apple</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-border" />
          <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
            ou com e-mail
          </Text>
          <View className="h-px flex-1 bg-border" />
        </View>

        <View className="gap-3">
          <TextInput
            className="rounded-2xl bg-subtle px-4 py-3 font-body text-base text-ink"
            style={shadow.card}
            placeholder="E-mail"
            placeholderTextColor={colors.dim}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            className="rounded-2xl bg-subtle px-4 py-3 font-body text-base text-ink"
            style={shadow.card}
            placeholder="Senha"
            placeholderTextColor={colors.dim}
            secureTextEntry
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            textContentType={mode === "login" ? "password" : "newPassword"}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            disabled={busy}
            onPress={submitEmail}
            className="items-center rounded-full bg-coral py-3 active:opacity-80 disabled:opacity-50"
            style={shadow.coral}
          >
            <Text className="font-body-bold text-base text-night">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")}>
          <Text className="text-center font-body text-sm text-turquoiseInk">
            {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
