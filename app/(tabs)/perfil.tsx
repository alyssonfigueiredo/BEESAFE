import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "expo-router";
import { useState } from "react";
import { Camera } from "lucide-react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { CityPicker } from "@/components/CityPicker";
import { useAvatarUrl, useChangeAvatar, useRemoveAvatar } from "@/hooks/useAvatar";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useBlocks";
import { useDeleteAccount, useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { authMessage } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useCity } from "@/providers/CityProvider";
import { colors, mark, shadow } from "@/theme/tokens";

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
      setNickname(null); // volta a mostrar o que está gravado
      Alert.alert(
        "Salvo",
        value.trim() ? `Seu apelido agora é “${value.trim()}”.` : "Você aparece como Anônimo.",
      );
    } catch (e) {
      Alert.alert("Não deu certo", authMessage(e) ?? "Tente de novo.");
    }
  }

  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_path);
  const photo = useChangeAvatar();
  const removePhoto = useRemoveAvatar();
  const fail = (e: unknown) => Alert.alert("Não deu certo", authMessage(e) ?? "Tente de novo.");

  function changePhoto() {
    if (!profile?.avatar_path) return photo.mutate(undefined, { onError: fail });
    Alert.alert("Foto de perfil", "Só você vê essa foto. Ela não aparece no mural nem nas avaliações.", [
      { text: "Trocar foto", onPress: () => photo.mutate(undefined, { onError: fail }) },
      {
        text: "Remover foto",
        style: "destructive",
        onPress: () => removePhoto.mutate(profile.avatar_path!, { onError: fail }),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
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
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={changePhoto}
            disabled={photo.isPending}
            className="h-16 w-16 items-center justify-center active:opacity-80"
          >
            <Svg width={64} height={64} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="avatar" x1="0" y1="0" x2="1" y2="1">
                  {mark.ring.map((c, i) => (
                    <Stop key={c} offset={i / (mark.ring.length - 1)} stopColor={c} />
                  ))}
                </LinearGradient>
              </Defs>
              <Circle cx={32} cy={32} r={30} fill="#FFFFFF" stroke="url(#avatar)" strokeWidth={3} />
            </Svg>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 54, height: 54, borderRadius: 27 }} />
            ) : (
              <Camera color={colors.dim} size={22} strokeWidth={1.75} />
            )}
          </Pressable>
          <View className="min-w-0 flex-1">
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
        </View>

        <View className="gap-3 rounded-3xl bg-surface p-4" style={shadow.card}>
          <Text className="font-body-bold text-xs text-muted">
            Apelido no mural e nas avaliações
          </Text>
          <TextInput
            className="rounded-2xl bg-solid px-4 py-3 font-body text-base text-ink"
            style={shadow.field}
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

        <View className="gap-2 rounded-3xl bg-surface p-4" style={shadow.card}>
          <Text className="font-body-bold text-xs text-muted">Pessoas bloqueadas</Text>
          {blocked.length === 0 ? (
            <Text className="font-body text-sm text-muted">
              Ninguém. Para bloquear alguém, toque no ícone de bloqueio em uma mensagem do mural ou
              em uma avaliação: o que a pessoa publicar deixa de aparecer para você.
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
                      .catch((e) =>
                        Alert.alert("Não deu certo", authMessage(e) ?? "Tente de novo."),
                      )
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
