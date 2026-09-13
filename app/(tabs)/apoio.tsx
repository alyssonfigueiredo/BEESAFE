import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExternalLink, Heart, Phone } from "lucide-react-native";
import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import {
  usePostSupportMessage,
  useSupportMessages,
  useSupportServices,
  useToggleLike,
} from "@/hooks/useSupport";
import { useCity } from "@/providers/CityProvider";
import { SUPPORT_CATEGORIES, type SupportCategory } from "@/theme/domain";
import { colors } from "@/theme/tokens";

const CATEGORY_KEYS = Object.keys(SUPPORT_CATEGORIES) as SupportCategory[];
const KIND_LABEL: Record<string, string> = {
  policia: "Polícia",
  saude: "Saúde",
  direitos: "Direitos humanos",
  acolhimento: "Acolhimento",
  ong: "ONG",
  juridico: "Jurídico",
};

export default function ApoioScreen() {
  const { city } = useCity();
  const { data: messages = [] } = useSupportMessages();
  const { data: services = [] } = useSupportServices(city?.id);
  const post = usePostSupportMessage();
  const toggle = useToggleLike();
  const [nickname, setNickname] = useState("");
  const [category, setCategory] = useState<SupportCategory>("acolhimento");
  const [content, setContent] = useState("");

  async function submit() {
    if (!content.trim()) return Alert.alert("Escreva a mensagem.");
    try {
      await post.mutateAsync({ nickname, category, content, cityId: city?.id });
      setContent("");
    } catch (e) {
      Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo.");
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-night"
      contentContainerClassName="gap-4 px-4 py-4"
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <Text className="font-display text-3xl uppercase tracking-widest text-ink">Apoio</Text>
        <Text className="font-body text-sm text-dim">Mural da comunidade e serviços de apoio</Text>
      </View>

      <View className="gap-3 rounded-xl border border-border bg-surface p-4">
        <Text className="font-heading text-base uppercase tracking-widest text-ink">
          Deixe uma mensagem
        </Text>
        <TextInput
          className="rounded-xl border border-border bg-night px-4 py-3 font-body text-base text-ink"
          placeholder="Apelido (opcional, vira Anônimo)"
          placeholderTextColor={colors.dim}
          maxLength={40}
          value={nickname}
          onChangeText={setNickname}
        />
        <View className="flex-row flex-wrap gap-2">
          {CATEGORY_KEYS.map((k) => {
            const c = SUPPORT_CATEGORIES[k];
            const active = category === k;
            return (
              <Pressable
                key={k}
                onPress={() => setCategory(k)}
                className="rounded-full border px-3 py-1.5"
                style={{ borderColor: c.color, backgroundColor: active ? c.color : "transparent" }}
              >
                <Text
                  className="font-body-medium text-xs"
                  style={{ color: active ? colors.night : c.color }}
                >
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          className="min-h-24 rounded-xl border border-border bg-night px-4 py-3 font-body text-base text-ink"
          placeholder="Uma palavra de acolhimento, uma dica ou um pedido de ajuda (até 1000 caracteres)"
          placeholderTextColor={colors.dim}
          multiline
          textAlignVertical="top"
          maxLength={1000}
          value={content}
          onChangeText={setContent}
        />
        <Pressable
          disabled={post.isPending}
          onPress={submit}
          className="items-center rounded-xl bg-turquoise py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="font-heading text-base uppercase tracking-widest text-night">
            {post.isPending ? "Enviando…" : "Publicar"}
          </Text>
        </Pressable>
      </View>

      <View className="gap-2">
        {messages.map((m) => {
          const c = SUPPORT_CATEGORIES[m.category];
          return (
            <View key={m.id} className="gap-2 rounded-xl border border-border bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <View className="rounded-full px-3 py-1" style={{ backgroundColor: c.color }}>
                  <Text className="font-body-bold text-xs uppercase tracking-wider text-night">
                    {c.label}
                  </Text>
                </View>
                <Text className="font-body text-xs text-dim">
                  {formatDistanceToNow(parseISO(m.created_at), { locale: ptBR, addSuffix: true })}
                </Text>
              </View>
              <Text className="font-body text-base text-ink">{m.content}</Text>
              <View className="flex-row items-center justify-between">
                <Text className="font-body-medium text-xs text-dim">{m.nickname}</Text>
                <Pressable
                  onPress={() => toggle.mutate({ id: m.id, liked: m.liked })}
                  className="flex-row items-center gap-1"
                  hitSlop={8}
                >
                  <Heart
                    size={16}
                    color={colors.coral}
                    fill={m.liked ? colors.coral : "transparent"}
                  />
                  <Text className="font-body-medium text-xs text-muted">{m.likes}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View className="gap-3 rounded-xl border border-border bg-surface p-4">
        <Text className="font-heading text-base uppercase tracking-widest text-ink">
          Serviços de apoio{city ? ` · ${city.name}` : ""}
        </Text>
        {services.map((s) => (
          <View key={s.id} className="gap-1 border-b border-border pb-3">
            <View className="flex-row items-center justify-between gap-2">
              <Text className="min-w-0 flex-1 font-body-bold text-sm text-ink">{s.name}</Text>
              <Text className="font-body text-xs text-turquoise">{KIND_LABEL[s.kind]}</Text>
            </View>
            {!!s.description && (
              <Text className="font-body text-xs text-muted">{s.description}</Text>
            )}
            <View className="flex-row gap-3">
              {!!s.phone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${s.phone}`)}
                  className="flex-row items-center gap-1"
                >
                  <Phone size={14} color={colors.coral} />
                  <Text className="font-body-bold text-sm text-coral">{s.phone}</Text>
                </Pressable>
              )}
              {!!s.url && (
                <Pressable
                  onPress={() => Linking.openURL(s.url!)}
                  className="flex-row items-center gap-1"
                >
                  <ExternalLink size={14} color={colors.turquoise} />
                  <Text className="font-body text-sm text-turquoise">Site</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
