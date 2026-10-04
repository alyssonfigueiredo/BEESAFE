import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "expo-router";
import {
  Ban,
  Camera,
  Compass,
  LogOut,
  Trash2,
  MapPin,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { PrimaryButton } from "@/components/Button";
import { Field, FieldShell } from "@/components/Field";
import { ConquistasCard } from "@/components/gami/ConquistasCard";
import { EvolucaoCard } from "@/components/gami/Evolucao";
import { FormaCard } from "@/components/gami/FormaCard";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { abrirTour } from "@/hooks/useTour";
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

  function confirmDelete() {
    Alert.alert(
      "Excluir conta",
      "Seus relatos e mensagens continuam no app, sem nenhum vínculo com você. As avaliações que você fez também ficam, sem vínculo com você; fotos que você enviou, curtidas e bloqueios são apagados. Se você entrou com a Apple, o vínculo com sua conta Apple também é desfeito. Não dá para desfazer.",
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

  const { data: avatarUrl } = useAvatarUrl(profile?.avatar_path);
  const photo = useChangeAvatar();
  const removePhoto = useRemoveAvatar();
  const fail = (e: unknown) => Alert.alert("Não deu certo", authMessage(e) ?? "Tente de novo.");

  function changePhoto() {
    if (!profile?.avatar_path) return photo.mutate(undefined, { onError: fail });
    Alert.alert(
      "Foto de perfil",
      "Só você vê essa foto. Ela não aparece no mural nem nas avaliações.",
      [
        { text: "Trocar foto", onPress: () => photo.mutate(undefined, { onError: fail }) },
        {
          text: "Remover foto",
          style: "destructive",
          onPress: () => removePhoto.mutate(profile.avatar_path!, { onError: fail }),
        },
        { text: "Cancelar", style: "cancel" },
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
        contentContainerClassName="gap-6 px-6"
        contentContainerStyle={insets}
        keyboardShouldPersistTaps="handled"
      >
        <View
          className="flex-row items-center gap-5 rounded-[30px] bg-surface px-6 py-6"
          style={shadow.card}
        >
          <Pressable
            onPress={changePhoto}
            disabled={photo.isPending}
            className="h-[72px] w-[72px] items-center justify-center active:opacity-80"
          >
            <Svg width={72} height={72} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="avatar" x1="0" y1="0" x2="1" y2="1">
                  {mark.ring.map((c, i) => (
                    <Stop key={c} offset={i / (mark.ring.length - 1)} stopColor={c} />
                  ))}
                </LinearGradient>
              </Defs>
              <Circle cx={36} cy={36} r={34} fill="#FFFFFF" stroke="url(#avatar)" strokeWidth={3} />
            </Svg>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 62, height: 62, borderRadius: 31 }}
              />
            ) : (
              <Text className="font-display text-3xl uppercase text-ink">{shown.charAt(0)}</Text>
            )}
            <View
              className="absolute -bottom-0.5 -right-0.5 h-7 w-7 items-center justify-center rounded-full bg-solid"
              style={shadow.field}
            >
              <Camera color={colors.ink} size={14} strokeWidth={1.75} />
            </View>
          </Pressable>
          <View className="min-w-0 flex-1 gap-1">
            <Text
              className="font-display text-[22px] uppercase tracking-wide text-ink"
              numberOfLines={1}
            >
              {shown}
            </Text>
            <Text className="font-body text-[13px] text-dim" numberOfLines={1}>
              {mail}
            </Text>
            <View className="flex-row flex-wrap gap-1.5 pt-1">
              {city && <Pill label={`${city.name} · ${city.state}`} />}
              {profile && profile.role !== "user" && (
                <Pill
                  label={profile.role === "admin" ? "Administração" : "Moderação"}
                  bg={colors.lilac + "26"}
                  fg={colors.lilacInk}
                />
              )}
            </View>
          </View>
        </View>

        <EvolucaoCard />
        <ConquistasCard />

        <View className="gap-4 rounded-[30px] bg-surface px-6 py-7" style={shadow.card}>
          <Text className="font-body-medium text-[17px] text-ink">Seu perfil</Text>
          <Field
            label="Apelido no mural e nas avaliações"
            icon={User}
            placeholder="Vazio = Anônimo"
            maxLength={40}
            value={value}
            onChangeText={setNickname}
          />
          <FieldShell label="Cidade padrão" icon={MapPin}>
            <View className="h-full flex-1 justify-center">
              <CityPicker />
            </View>
          </FieldShell>
          <PrimaryButton
            tone="turquoise"
            label="Salvar"
            disabled={update.isPending}
            onPress={save}
          />
        </View>

        <FormaCard />

        <View className="rounded-[30px] bg-surface px-6 py-3" style={shadow.card}>
          <ListRow icon={ShieldCheck} color={colors.yellowInk} title="Privacidade">
            <Text className="font-body text-[12.5px] leading-[17px] text-dim">
              Relatos e mensagens nunca mostram seu nome ou e-mail. Só o apelido que você escolher
              aparece no mural e nas avaliações.
            </Text>
          </ListRow>
          <ListRow icon={Ban} color={colors.coralInk} title="Pessoas bloqueadas">
            {blocked.length === 0 ? (
              <Text className="font-body text-[12.5px] leading-[17px] text-dim">
                Ninguém por aqui. Bloqueie pelo ícone em uma mensagem do mural ou avaliação.
              </Text>
            ) : (
              blocked.map((b) => (
                <View key={b.blocked_id} className="flex-row items-center justify-between gap-3">
                  <Text className="flex-1 font-body text-[12.5px] text-dim">
                    Bloqueada em {format(parseISO(b.created_at), "d 'de' MMM", { locale: ptBR })}
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
                    <Text className="font-body-bold text-[13px] text-turquoiseInk">
                      Desbloquear
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </ListRow>
          <ListRow icon={Compass} color={colors.turquoiseInk} title="Como a Irisa funciona" last>
            <Pressable onPress={abrirTour} hitSlop={8}>
              <Text className="font-body-bold text-[13px] text-turquoiseInk">Rever o tour</Text>
            </Pressable>
          </ListRow>
        </View>

        {profile && profile.role !== "user" && (
          <Link href="/moderacao" asChild>
            <Pressable
              className="h-[52px] items-center justify-center rounded-full bg-lilac active:opacity-80"
              style={shadow.lilac}
            >
              <Text className="font-body-bold text-base text-night">Fila de moderação</Text>
            </Pressable>
          </Link>
        )}
        <View className="gap-2 pt-1">
          <Pressable
            onPress={() => supabase.auth.signOut()}
            className="min-h-[52px] flex-row items-center justify-center gap-2 rounded-full bg-solid px-6 py-3.5 active:opacity-80"
            style={shadow.field}
          >
            <LogOut color={colors.ink} size={18} strokeWidth={1.75} />
            <Text className="font-body-bold text-[15px] text-ink">Sair</Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            className="min-h-[48px] flex-row items-center justify-center gap-2 py-3 active:opacity-70"
          >
            <Trash2 color={colors.coralInk} size={16} strokeWidth={1.75} />
            <Text className="font-body-medium text-sm text-coralInk">Excluir minha conta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function Pill({
  label,
  bg = colors.subtle,
  fg = colors.muted,
}: {
  label: string;
  bg?: string;
  fg?: string;
}) {
  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: bg }}>
      <Text className="font-body-medium text-[11.5px]" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Linha de lista: botão circular com ícone em linha, título e apoio; traço pontilhado entre linhas. */
function ListRow({
  icon,
  color,
  title,
  last,
  children,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <View
      className={`flex-row items-center gap-3.5 py-5 ${last ? "" : "border-b border-dashed border-ink/15"}`}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full bg-solid"
        style={shadow.field}
      >
        <Icon_ icon={icon} color={color} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-body-bold text-[15px] text-ink">{title}</Text>
        {children}
      </View>
    </View>
  );
}

function Icon_({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return <Icon color={color} size={18} strokeWidth={1.75} />;
}
