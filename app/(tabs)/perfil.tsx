import { Link } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { CityPicker } from "@/components/CityPicker";
import { useDeleteAccount, useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { authMessage } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useCity } from "@/providers/CityProvider";
import { colors, shadow } from "@/theme/tokens";

export default function PerfilScreen() {
  const insets = useScreenInsets();
  const { session } = useAuth();
  const { city } = useCity();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const del = useDeleteAccount();
  const [nickname, setNickname] = useState<string | null>(null);
  const value = nickname ?? profile?.nickname ?? "";

  async function save() {
    try {
      await update.mutateAsync({ nickname: value, defaultCityId: city?.id ?? null });
      setNickname(null); // volta a mostrar o que está gravado
      Alert.alert(
        "Salvo",
        value.trim() ? `Seu apelido agora é “${value.trim()}”.` : "Você aparece como Anônimo.",
      );
    } catch (e) {
      Alert.alert("Não deu certo", authMessage(e) ?? "Tente de novo.");
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Excluir conta",
      "Seus relatos e mensagens continuam no app, sem nenhum vínculo com você. Avaliações e curtidas são apagadas. Não dá para desfazer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () =>
            del
              .mutateAsync()
              .catch((e) => Alert.alert("Não deu certo", authMessage(e) ?? "Tente de novo.")),
        },
      ],
    );
  }

  return (
    <View className="flex-1">
      <Aurora />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4"
        contentContainerStyle={insets}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text className="font-display text-2xl uppercase tracking-wide text-ink">Perfil</Text>
          <Text className="font-body text-sm text-dim">
            {session?.user.email?.endsWith("privaterelay.appleid.com")
              ? "Conta Apple (e-mail oculto)"
              : session?.user.email}
          </Text>
          {profile?.role !== "user" && profile && (
            <Text className="font-body-bold text-xs uppercase tracking-widest text-lilacInk">
              {profile.role === "admin" ? "Administração" : "Moderação"}
            </Text>
          )}
        </View>

        <View className="gap-3 rounded-3xl bg-surface p-4" style={shadow.card}>
          <Text className="font-body-bold text-xs text-muted">
            Apelido no mural e nas avaliações
          </Text>
          <TextInput
            className="rounded-2xl bg-subtle px-4 py-3 font-body text-base text-ink"
            placeholder="Vazio = Anônimo"
            placeholderTextColor={colors.dim}
            maxLength={40}
            value={value}
            onChangeText={setNickname}
          />
          <Text className="font-body-bold text-xs text-muted">Cidade padrão</Text>
          <CityPicker />
          <Pressable
            disabled={update.isPending}
            onPress={save}
            className="items-center rounded-full bg-turquoise py-3 active:opacity-80 disabled:opacity-50"
            style={shadow.turquoise}
          >
            <Text className="font-body-bold text-base text-night">Salvar</Text>
          </Pressable>
        </View>

        <View className="gap-2 rounded-3xl bg-surface p-4" style={shadow.card}>
          <Text className="font-body-bold text-xs text-muted">Privacidade</Text>
          <Text className="font-body text-sm text-muted">
            Relatos e mensagens nunca mostram seu nome ou e-mail. Só o apelido que você escolher
            aparece no mural e nas avaliações de lugares.
          </Text>
        </View>

        <Link href="/bloqueados" asChild>
          <Pressable
            className="flex-row items-center justify-between rounded-3xl bg-surface p-4 active:opacity-80"
            style={shadow.card}
          >
            <View className="gap-1">
              <Text className="font-body-bold text-base text-ink">Pessoas bloqueadas</Text>
              <Text className="font-body text-sm text-muted">
                Você não vê o conteúdo de quem bloqueou. Dá para desfazer aqui.
              </Text>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </Pressable>
        </Link>

        {profile && profile.role !== "user" && (
          <Link href="/moderacao" asChild>
            <Pressable
              className="items-center rounded-full bg-lilac py-3 active:opacity-80"
              style={shadow.lilac}
            >
              <Text className="font-body-bold text-base text-night">Fila de moderação</Text>
            </Pressable>
          </Link>
        )}
        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="items-center rounded-full bg-subtle py-3 active:opacity-80"
        >
          <Text className="font-body-bold text-base text-ink">Sair</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} className="items-center py-3 active:opacity-80">
          <Text className="font-body text-sm text-coralInk">Excluir minha conta</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
