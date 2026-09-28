import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { useScreenInsets } from "@/hooks/useScreenInsets";
import { CityPicker } from "@/components/CityPicker";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useBlocks";
import { useDeleteAccount, useProfile, useUpdateProfile } from "@/hooks/useProfile";
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
  const { data: blocked = [] } = useBlockedUsers();
  const unblock = useUnblockUser();
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
      "Seus relatos e mensagens continuam no app, sem nenhum vínculo com você. Avaliações e curtidas são apagadas. Se você entrou com a Apple, o vínculo com sua conta Apple também é desfeito. Não dá para desfazer.",
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
      contentContainerClassName="gap-4 px-4"
      contentContainerStyle={insets}
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

      <View className="gap-3 rounded-xl border border-border bg-surface p-4" style={shadow.card}>
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
          className="items-center rounded-full bg-turquoise py-3 active:opacity-80 disabled:opacity-50"
          style={shadow.turquoise}
        >
          <Text className="font-heading text-base uppercase tracking-widest text-night">
            Salvar
          </Text>
        </Pressable>
      </View>

      <View className="gap-2 rounded-xl border border-border bg-surface p-4" style={shadow.card}>
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">
          Privacidade
        </Text>
        <Text className="font-body text-sm text-muted">
          Relatos e mensagens nunca mostram seu nome ou e-mail. Só o apelido que você escolher
          aparece no mural e nas avaliações de lugares.
        </Text>
      </View>

      <View className="gap-2 rounded-xl border border-border bg-surface p-4" style={shadow.card}>
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">
          Pessoas bloqueadas
        </Text>
        {blocked.length === 0 ? (
          <Text className="font-body text-sm text-muted">
            Ninguém. Para bloquear alguém, toque no ícone de bloqueio em uma mensagem do mural ou em
            uma avaliação: o que a pessoa publicar deixa de aparecer para você.
          </Text>
        ) : (
          blocked.map((b) => (
            <View
              key={b.blocked_id}
              className="flex-row items-center justify-between border-b border-border pb-2"
            >
              <Text className="font-body text-sm text-muted">
                Bloqueada em {format(parseISO(b.created_at), "d 'de' MMMM", { locale: ptBR })}
              </Text>
              <Pressable
                disabled={unblock.isPending}
                onPress={() =>
                  unblock
                    .mutateAsync(b.blocked_id)
                    .catch((e) => Alert.alert("Não deu certo", e.message))
                }
                hitSlop={8}
              >
                <Text className="font-body-bold text-sm text-turquoiseInk">Desbloquear</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      {profile && profile.role !== "user" && (
        <Link href="/moderacao" asChild>
          <Pressable
            className="items-center rounded-full bg-lilac py-3 active:opacity-80"
            style={shadow.lilac}
          >
            <Text className="font-heading text-base uppercase tracking-widest text-night">
              Fila de moderação
            </Text>
          </Pressable>
        </Link>
      )}
      <Pressable
        onPress={() => supabase.auth.signOut()}
        className="items-center rounded-full border border-border py-3 active:opacity-80"
      >
        <Text className="font-heading text-base uppercase tracking-widest text-muted">Sair</Text>
      </Pressable>
      <Pressable onPress={confirmDelete} className="items-center py-3 active:opacity-80">
        <Text className="font-body text-sm text-coralInk">Excluir minha conta</Text>
      </Pressable>
    </ScrollView>
  );
}
