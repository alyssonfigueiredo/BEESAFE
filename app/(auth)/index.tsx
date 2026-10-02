import { useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react-native";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Aurora } from "@/components/Aurora";
import { AppleLogo, GoogleG } from "@/components/BrandIcons";
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
      // O link do e-mail de confirmação abre o app (irisa://auth/callback), que já entra na conta.
      const { data, error } = await supabase.auth.signUp({
        email: mail,
        password,
        options: { emailRedirectTo: "irisa://auth/callback" },
      });
      if (error) throw error;
      // Com confirmação ligada, a Supabase devolve usuário sem sessão; com e-mail já usado,
      // devolve usuário sem identidades (para não revelar quem tem conta).
      if (data.user && data.user.identities?.length === 0)
        throw new Error("User already registered");
      if (!data.session) {
        Alert.alert(
          "Confira seu e-mail",
          "Mandamos um link para confirmar a conta. Abra o e-mail neste celular e toque no link: você entra direto.",
        );
        setMode("login");
      }
    });
  }

  return (
    <View className="flex-1">
      <Aurora />
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerClassName="flex-grow justify-center gap-6 px-5 py-6"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-4">
              <Logo size="lg" />
              <Text className="font-display text-3xl uppercase leading-9 tracking-wide text-ink">
                Entre para dar cor ao mapa
              </Text>
              <Text className="font-body text-base text-muted">
                Sua identidade nunca aparece. O cadastro existe só para evitar relatos falsos.
              </Text>
            </View>

            <View className="gap-3 rounded-[28px] bg-surface p-5" style={shadow.card}>
              <Pressable
                disabled={busy}
                onPress={() => run(signInWithGoogle)}
                className="h-12 flex-row items-center justify-center gap-3 rounded-full bg-solid active:opacity-80 disabled:opacity-50"
                style={shadow.card}
              >
                <GoogleG size={20} />
                <Text className="font-body-bold text-base text-ink">Entrar com Google</Text>
              </Pressable>
              {appleAvailable && Platform.OS === "ios" && (
                <Pressable
                  disabled={busy}
                  onPress={() => run(signInWithApple)}
                  className="h-12 flex-row items-center justify-center gap-3 rounded-full bg-black active:opacity-80 disabled:opacity-50"
                >
                  <AppleLogo size={20} />
                  <Text className="font-body-bold text-base text-white">Entrar com Apple</Text>
                </Pressable>
              )}

              <View className="flex-row items-center gap-3 py-1">
                <View className="h-px flex-1 bg-border" />
                <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
                  ou com e-mail
                </Text>
                <View className="h-px flex-1 bg-border" />
              </View>

              <View className="flex-row items-center gap-3 rounded-2xl bg-subtle px-4">
                <Mail color={colors.dim} size={18} />
                <TextInput
                  className="flex-1 py-3 font-body text-base text-ink"
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
              </View>
              <View className="flex-row items-center gap-3 rounded-2xl bg-subtle px-4">
                <Lock color={colors.dim} size={18} />
                <TextInput
                  className="flex-1 py-3 font-body text-base text-ink"
                  placeholder="Senha"
                  placeholderTextColor={colors.dim}
                  secureTextEntry
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  textContentType={mode === "login" ? "password" : "newPassword"}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
              <Pressable
                disabled={busy}
                onPress={submitEmail}
                className="h-12 items-center justify-center rounded-full bg-coral active:opacity-80 disabled:opacity-50"
                style={shadow.coral}
              >
                <Text className="font-body-bold text-base text-night">
                  {mode === "login" ? "Entrar" : "Criar conta"}
                </Text>
              </Pressable>
            </View>

            <Pressable onPress={() => setMode(mode === "login" ? "signup" : "login")}>
              <Text className="text-center font-body-medium text-sm text-turquoiseInk">
                {mode === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
