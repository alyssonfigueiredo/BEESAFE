import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { CityPicker } from "@/components/CityPicker";
import { useDeleteAccount, useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useCity } from "@/providers/CityProvider";
import { colors } from "@/theme/tokens";

export default function PerfilScreen() {
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
      Alert.alert("Salvo");
    } catch (e) {
      Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo.");
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
          onPress: () => del.mutateAsync().catch((e) => Alert.alert("Não deu certo", e.message)),
        },
      ],
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-paper"
      contentContainerClassName="gap-4 px-4 py-4"
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="font-display text-3xl uppercase tracking-widest text-ink">Perfil</Text>
        <Text className="font-body text-sm text-dim">{session?.user.email}</Text>
        {profile?.role !== "user" && profile && (
          <Text className="font-body-bold text-xs uppercase tracking-widest text-lilacInk">
            {profile.role === "admin" ? "Administração" : "Moderação"}
          </Text>
        )}
      </View>

      <View className="gap-3 rounded-xl border border-border bg-surface p-4">
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">
          Apelido no mural e nas avaliações
        </Text>
        <TextInput
          className="rounded-xl border border-border bg-paper px-4 py-3 font-body text-base text-ink"
          placeholder="Vazio = Anônimo"
          placeholderTextColor={colors.dim}
          maxLength={40}
          value={value}
          onChangeText={setNickname}
        />
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">
          Cidade padrão
        </Text>
        <CityPicker />
        <Pressable
          disabled={update.isPending}
          onPress={save}
          className="items-center rounded-xl bg-turquoise py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="font-heading text-base uppercase tracking-widest text-night">
            Salvar
          </Text>
        </Pressable>
      </View>

      <View className="gap-2 rounded-xl border border-border bg-surface p-4">
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">
          Privacidade
        </Text>
        <Text className="font-body text-sm text-muted">
          Relatos e mensagens nunca mostram seu nome ou e-mail. Só o apelido que você escolher
          aparece no mural e nas avaliações de lugares.
        </Text>
      </View>

      {profile && profile.role !== "user" && (
        <Link href="/moderacao" asChild>
          <Pressable className="items-center rounded-xl bg-lilac py-3 active:opacity-80">
            <Text className="font-heading text-base uppercase tracking-widest text-night">
              Fila de moderação
            </Text>
          </Pressable>
        </Link>
      )}
      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="items-center rounded-xl border border-border py-3 active:opacity-80"
      >
        <Text className="font-heading text-base uppercase tracking-widest text-muted">Sair</Text>
      </Pressable>
      <Pressable onPress={confirmDelete} className="items-center py-3 active:opacity-80">
        <Text className="font-body text-sm text-coralInk">Excluir minha conta</Text>
      </Pressable>
    </ScrollView>
  );
}
