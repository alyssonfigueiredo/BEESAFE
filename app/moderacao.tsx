import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Stack } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useScreenInsets } from "@/hooks/useScreenInsets";
import { useModerate, useModerationQueue } from "@/hooks/useModeration";
import { useProfile } from "@/hooks/useProfile";
import { Glass } from "@/components/Glass";
import { colors, shadow } from "@/theme/tokens";

const TYPE_LABEL = {
  occurrence: "Relato",
  place: "Lugar",
  rating: "Avaliação",
  message: "Mensagem",
} as const;

export default function ModeracaoScreen() {
  const insets = useScreenInsets({ tabs: false });
  const { data: profile } = useProfile();
  const isMod = profile?.role === "moderator" || profile?.role === "admin";
  const { data: queue = [], isLoading } = useModerationQueue(isMod);
  const moderate = useModerate();

  function act(type: keyof typeof TYPE_LABEL, id: string, action: "remove" | "restore") {
    moderate
      .mutateAsync({ type, id, action })
      .catch((e) => Alert.alert("Não deu certo", e.message));
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: "Voltar",
          title: "Moderação",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerBackground: () => <Glass style={StyleSheet.absoluteFill} />,
          headerTintColor: colors.ink,
        }}
      />
      <ScrollView
        className="flex-1 bg-paper"
        contentContainerClassName="gap-3 px-4"
        contentContainerStyle={insets}
      >
        {!isMod && <Text className="font-body text-muted">Área restrita à moderação.</Text>}
        {isMod && isLoading && <Text className="font-body text-dim">Carregando fila…</Text>}
        {isMod && !isLoading && queue.length === 0 && (
          <Text className="font-body text-dim">Fila vazia. Nada denunciado em aberto.</Text>
        )}
        {queue.map((item) => (
          <View
            key={`${item.target_type}:${item.target_id}`}
            className="gap-2 rounded-xl border border-border bg-surface p-4"
            style={shadow.card}
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-heading text-sm uppercase tracking-widest text-lilacInk">
                {TYPE_LABEL[item.target_type]}
              </Text>
              <Text className="font-body text-xs text-dim">
                {item.reports} denúncia{item.reports === 1 ? "" : "s"} ·{" "}
                {formatDistanceToNow(parseISO(item.first_reported), {
                  locale: ptBR,
                  addSuffix: true,
                })}
                {item.current_status === "hidden" ? " · oculto" : ""}
              </Text>
            </View>
            <Text className="font-body text-base text-ink">
              {item.summary ?? "(conteúdo indisponível)"}
            </Text>
            <Text className="font-body text-xs text-muted">
              Motivos: {item.reasons.join(" · ")}
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => act(item.target_type, item.target_id, "remove")}
                className="flex-1 items-center rounded-full bg-coral py-2 active:opacity-80"
                style={shadow.coral}
              >
                <Text className="font-heading text-sm uppercase tracking-widest text-night">
                  Remover
                </Text>
              </Pressable>
              <Pressable
                onPress={() => act(item.target_type, item.target_id, "restore")}
                className="flex-1 items-center rounded-xl border border-turquoise py-2 active:opacity-80"
              >
                <Text className="font-heading text-sm uppercase tracking-widest text-turquoiseInk">
                  Manter
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  );
}
