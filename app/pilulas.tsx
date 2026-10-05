import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { BotaoCompartilhar, CompartilharSheet } from "@/components/gami/Compartilhar";
import { useLastComfortPill, useNextComfortPill } from "@/hooks/useComfortPill";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { colors, shadow } from "@/theme/tokens";

/**
 * Pílula de acolhimento: atalho no Perfil e tela que a notificação push abre (data.url = /pilulas).
 * Mostra a última pílula recebida (a mesma que chegou por push, se foi por aí) e deixa pedir outra
 * ou compartilhar como imagem de story — só a frase e a marca, nenhum dado da pessoa.
 */
export default function PilulasScreen() {
  const insets = useScreenInsets({ tabs: false });
  const { data: ultima, isLoading } = useLastComfortPill();
  const next = useNextComfortPill();
  const [erro, setErro] = useState<string | null>(null);
  const [compartilhando, setCompartilhando] = useState(false);

  // Primeira vez (nunca recebeu nenhuma): pede uma sozinho, sem precisar tocar em nada.
  const pilula = ultima ?? (next.data ?? null);
  const pediuSozinho = useRef(false);

  async function pedirOutra() {
    setErro(null);
    try {
      await next.mutateAsync();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu para buscar agora. Tente de novo.");
    }
  }

  useEffect(() => {
    if (!isLoading && !pilula && !pediuSozinho.current) {
      pediuSozinho.current = true;
      void pedirOutra();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, pilula]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: "Perfil",
          title: "",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1">
        <Aurora />
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-5"
          contentContainerStyle={[insets, { flexGrow: 1, justifyContent: "center" }]}
        >
          <View className="items-center gap-2">
            <Text className="font-body-bold text-[11px] uppercase tracking-[2px] text-turquoiseInk">
              Pílula de acolhimento
            </Text>
            <Text className="text-center font-body text-[13px] text-dim">
              Uma frase de apoio pra agora. Sem cobrar nada de volta.
            </Text>
          </View>

          <View className="rounded-[28px] bg-surface px-6 py-10" style={shadow.card}>
            {isLoading || (next.isPending && !pilula) ? (
              <ActivityIndicator color={colors.turquoiseInk} />
            ) : pilula ? (
              <View className="items-center gap-3">
                <Text className="text-center font-heading text-[30px] uppercase leading-[34px] text-ink">
                  {pilula.line1}
                </Text>
                <Text className="text-center font-heading text-[30px] uppercase leading-[34px] text-turquoiseInk">
                  {pilula.line2}
                </Text>
                {!!pilula.body && (
                  <Text className="mt-1 text-center font-body text-[15px] leading-[21px] text-muted">
                    {pilula.body}
                  </Text>
                )}
              </View>
            ) : (
              <Text className="text-center font-body text-[14px] text-dim">
                {erro ?? "Não encontrei nenhuma pílula agora."}
              </Text>
            )}
          </View>

          <View className="gap-2">
            <Pressable
              onPress={pedirOutra}
              disabled={next.isPending}
              className="h-[52px] items-center justify-center rounded-full bg-turquoise active:opacity-80"
              style={[shadow.turquoise, { opacity: next.isPending ? 0.7 : 1 }]}
            >
              <Text className="font-body-bold text-[15px] text-night">
                {next.isPending ? "Buscando…" : "Quero outra pílula"}
              </Text>
            </Pressable>
            {pilula && (
              <BotaoCompartilhar
                label="Compartilhar"
                onPress={() => setCompartilhando(true)}
              />
            )}
          </View>
        </ScrollView>
      </View>
      <CompartilharSheet
        c={compartilhando && pilula ? { tipo: "pilula", id: pilula.id, line1: pilula.line1, line2: pilula.line2 } : null}
        onClose={() => setCompartilhando(false)}
      />
    </>
  );
}
