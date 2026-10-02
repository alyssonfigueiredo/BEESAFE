import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "expo-router";
import { Ban, LogOut, ShieldCheck, User, type LucideIcon } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { RainbowLine } from "@/components/Rainbow";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { CityPicker } from "@/components/CityPicker";
import { useBlockedUsers, useUnblockUser } from "@/hooks/useBlocks";
import { useDeleteAccount, useProfile, useUpdateProfile } from "@/hooks/useProfile";
import { authMessage } from "@/lib/authErrors";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useCity } from "@/providers/CityProvider";
import { onLight } from "@/theme/domain";
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

  const shown = value.trim() || "Anônimo";
  const mail = session?.user.email?.endsWith("privaterelay.appleid.com")
    ? "Conta Apple (e-mail oculto)"
    : session?.user.email;

  return (
    <View className="flex-1">
      <Aurora />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4"
        contentContainerStyle={insets}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cartão escuro, como o do Início: a pessoa, sem nome real, só o apelido. */}
        <View
          className="gap-3 rounded-[28px] p-5"
          style={[{ backgroundColor: colors.night }, shadow.lift]}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="h-14 w-14 items-center justify-center rounded-2xl"
              style={{ backgroundColor: colors.lilac }}
            >
              <Text className="font-display text-2xl uppercase text-night">
                {shown.charAt(0)}
              </Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-display text-2xl uppercase tracking-wide text-paper" numberOfLines={1}>
                {shown}
              </Text>
              <Text className="font-body text-sm text-paper/60" numberOfLines={1}>
                {mail}
              </Text>
            </View>
          </View>
          <RainbowLine />
          <View className="flex-row flex-wrap items-center gap-2">
            {city && (
              <View
                className="rounded-full px-3 py-1"
                style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
              >
                <Text className="font-body-medium text-xs text-paper/80">
                  {city.name} · {city.state}
                </Text>
              </View>
            )}
            {profile && profile.role !== "user" && (
              <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.lilac }}>
                <Text className="font-body-bold text-xs text-night">
                  {profile.role === "admin" ? "Administração" : "Moderação"}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="gap-3 rounded-3xl bg-surface p-4" style={shadow.card}>
          <Header icon={User} color={colors.turquoise} title="Seu perfil" />
          <Text className="font-body-medium text-xs text-muted">
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
          <Text className="font-body-medium text-xs text-muted">Cidade padrão</Text>
          <CityPicker />
          <Pressable
            disabled={update.isPending}
            onPress={save}
            className="h-12 items-center justify-center rounded-full bg-turquoise active:opacity-80 disabled:opacity-50"
            style={shadow.turquoise}
          >
            <Text className="font-body-bold text-base text-night">Salvar</Text>
          </Pressable>
        </View>

        <View className="gap-2 rounded-3xl bg-surface p-4" style={shadow.card}>
          <Header icon={ShieldCheck} color={colors.yellow} title="Privacidade" />
          <Text className="font-body text-sm text-muted">
            Relatos e mensagens nunca mostram seu nome ou e-mail. Só o apelido que você escolher
            aparece no mural e nas avaliações de lugares.
          </Text>
        </View>

        <View className="gap-2 rounded-3xl bg-surface p-4" style={shadow.card}>
          <Header icon={Ban} color={colors.coral} title="Pessoas bloqueadas" />
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
              className="h-12 items-center justify-center rounded-full bg-lilac active:opacity-80"
              style={shadow.lilac}
            >
              <Text className="font-body-bold text-base text-night">Fila de moderação</Text>
            </Pressable>
          </Link>
        )}
        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="h-12 flex-row items-center justify-center gap-2 rounded-full bg-subtle active:opacity-80"
        >
          <LogOut color={colors.ink} size={18} />
          <Text className="font-body-bold text-base text-ink">Sair</Text>
        </Pressable>
        <Pressable onPress={confirmDelete} className="items-center py-3 active:opacity-80">
          <Text className="font-body text-sm text-coralInk">Excluir minha conta</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

/** Título de cartão: ícone tonal e rótulo. */
function Header({ icon: Icon, color, title }: { icon: LucideIcon; color: string; title: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="h-8 w-8 items-center justify-center rounded-xl"
        style={{ backgroundColor: color + "33" }}
      >
        <Icon color={onLight(color)} size={16} />
      </View>
      <Text className="font-body-bold text-base text-ink">{title}</Text>
    </View>
  );
}
