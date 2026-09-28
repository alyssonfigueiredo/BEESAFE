import { Stack } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { useBlocks, useUnblock } from "@/hooks/useModeration";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { colors, shadow } from "@/theme/tokens";

export default function BloqueadosScreen() {
  const insets = useScreenInsets({ tabs: false });
  const { data: blocks = [], isLoading } = useBlocks();
  const unblock = useUnblock();

  function confirmUnblock(id: string, nickname: string) {
    Alert.alert("Desbloquear?", `Você volta a ver o conteúdo de ${nickname}.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desbloquear",
        onPress: () =>
          unblock
            .mutateAsync(id)
            .catch((e) =>
              Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo."),
            ),
      },
    ]);
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: "Voltar",
          title: "Pessoas bloqueadas",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerBlurEffect: "systemUltraThinMaterial",
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
          <View className="gap-2 rounded-3xl bg-surface p-4" style={shadow.card}>
            <Text className="font-body text-sm text-muted">
              Para bloquear alguém, toque em “Denunciar” no relato, na avaliação ou na mensagem da
              pessoa e escolha “Bloquear esta pessoa”. O conteúdo de quem você bloqueou some para
              você.
            </Text>
          </View>

          {isLoading && <Text className="font-body text-dim">Carregando…</Text>}
          {!isLoading && blocks.length === 0 && (
            <Text className="font-body text-dim">Você não bloqueou ninguém.</Text>
          )}

          {blocks.map((b) => (
            <View
              key={b.blocked_id}
              className="flex-row items-center justify-between gap-3 rounded-3xl bg-surface p-4"
              style={shadow.card}
            >
              <Text className="flex-1 font-body-bold text-base text-ink">{b.nickname}</Text>
              <Pressable
                disabled={unblock.isPending}
                onPress={() => confirmUnblock(b.blocked_id, b.nickname)}
                className="rounded-full border px-4 py-2 active:opacity-80 disabled:opacity-50"
                style={{ borderColor: colors.border }}
              >
                <Text className="font-body-medium text-sm text-ink">Desbloquear</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    </>
  );
}
