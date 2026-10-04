import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Stack } from "expo-router";
import { Alert, Image, Pressable, ScrollView, Text, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import {
  useFilaDeFotos,
  useModerarFoto,
  useModerate,
  useModerationQueue,
} from "@/hooks/useModeration";
import { useProfile } from "@/hooks/useProfile";
import { colors, shadow } from "@/theme/tokens";

const TYPE_LABEL = {
  occurrence: "Relato",
  place: "Lugar",
  rating: "Avaliação",
  message: "Mensagem",
  photo: "Foto",
} as const;

const REVIEW_LABEL = {
  pendente: "esperando o robô",
  humano: "o robô ficou em dúvida",
  recusada: "o robô recusou",
} as const;

export default function ModeracaoScreen() {
  const insets = useScreenInsets({ tabs: false });
  const { data: profile } = useProfile();
  const isMod = profile?.role === "moderator" || profile?.role === "admin";
  const { data: queue = [], isLoading } = useModerationQueue(isMod);
  const moderate = useModerate();
  const { data: fotos = [] } = useFilaDeFotos(isMod);
  const moderarFoto = useModerarFoto();

  function decidirFoto(id: string, aprovar: boolean) {
    moderarFoto
      .mutateAsync({ id, aprovar })
      .catch((e) => Alert.alert("Não deu certo", e.message));
  }

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
          headerTintColor: colors.ink,
        }}
      />
      <View className="flex-1">
        <Aurora />
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 px-4"
          contentContainerStyle={insets}
        >
          {!isMod && <Text className="font-body text-muted">Área restrita à moderação.</Text>}
          {isMod && fotos.length > 0 && (
            <View className="gap-3">
              <Text className="font-body-bold text-base text-ink">
                Fotos esperando liberação ({fotos.length})
              </Text>
              <Text className="font-body text-xs text-dim">
                Nenhuma delas está aparecendo no app. Só entra na ficha depois de liberada aqui.
              </Text>
              {fotos.map((foto) => (
                <View
                  key={foto.id}
                  className="gap-3 rounded-3xl bg-surface p-4"
                  style={shadow.card}
                >
                  <Image
                    source={{ uri: foto.url }}
                    style={{ width: "100%", height: 160, borderRadius: 18 }}
                    resizeMode="cover"
                    accessibilityLabel="Foto enviada para o lugar"
                  />
                  <View className="gap-1">
                    <Text className="font-body-bold text-sm text-ink">{foto.place_name}</Text>
                    <Text className="font-body text-xs text-dim">
                      {REVIEW_LABEL[foto.review]} ·{" "}
                      {formatDistanceToNow(parseISO(foto.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </Text>
                    {!!foto.review_note && (
                      <Text className="font-body text-xs text-dim">{foto.review_note}</Text>
                    )}
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => decidirFoto(foto.id, true)}
                      className="h-[44px] flex-1 items-center justify-center rounded-full bg-turquoise active:opacity-80"
                      style={shadow.turquoise}
                    >
                      <Text className="font-body-bold text-sm text-night">Liberar</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => decidirFoto(foto.id, false)}
                      className="h-[44px] flex-1 items-center justify-center rounded-full bg-coral active:opacity-80"
                      style={shadow.coral}
                    >
                      <Text className="font-body-bold text-sm text-night">Recusar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
          {isMod && isLoading && <Text className="font-body text-dim">Carregando fila…</Text>}
          {isMod && !isLoading && queue.length === 0 && (
            <Text className="font-body text-dim">Fila vazia. Nada denunciado em aberto.</Text>
          )}
          {queue.map((item) => (
            <View
              key={`${item.target_type}:${item.target_id}`}
              className="gap-2 rounded-3xl bg-surface p-4"
              style={shadow.card}
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-body-bold text-sm text-lilacInk">
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
                  className="h-[44px] flex-1 items-center justify-center rounded-full bg-coral active:opacity-80"
                  style={shadow.coral}
                >
                  <Text className="font-body-bold text-sm text-night">Remover</Text>
                </Pressable>
                <Pressable
                  onPress={() => act(item.target_type, item.target_id, "restore")}
                  className="h-[44px] flex-1 items-center justify-center rounded-full bg-solid active:opacity-80"
                  style={shadow.field}
                >
                  <Text className="font-body-bold text-sm text-turquoiseInk">Manter</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );
}
