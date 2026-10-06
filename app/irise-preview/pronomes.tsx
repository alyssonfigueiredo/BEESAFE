import { router, Stack } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { Chip } from "@/components/Chip";
import { Segmented } from "@/components/Segmented";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { FORMA_PADRAO_POR_PRONOME, PRONOMES, type Forma } from "@/lib/irisePersonagens";
import { colors } from "@/theme/tokens";

const FORMA_OPCOES = [
  { key: "0", label: "Bem-vinda" },
  { key: "1", label: "Bem-vindo" },
  { key: "2", label: "Bem-vinde" },
] as const;

/**
 * Prévia do personagem do irise — tela 1 de 2 (pronomes). Nada aqui grava no perfil: é um
 * protótipo pra aprovar a direção antes de integrar de verdade. Ver docs/design/irise/README.md.
 */
export default function IrisePreviewPronomes() {
  const insets = useScreenInsets({ tabs: false });
  const [nome, setNome] = useState("");
  const [pronomeIdx, setPronomeIdx] = useState<number | null>(null);
  const [outro, setOutro] = useState("");
  const [forma, setForma] = useState<Forma>(2);

  function escolherPronome(i: number) {
    setPronomeIdx(i);
    setForma(FORMA_PADRAO_POR_PRONOME[i]);
  }

  const pronome = pronomeIdx == null ? "" : pronomeIdx === 4 ? outro.trim() : PRONOMES[pronomeIdx];
  const podeContinuar = nome.trim().length > 0 && !!pronome;
  const saudacao = `${FORMA_OPCOES[forma].label}, ${nome.trim() || "…"}!`;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          // Essa tela pode abrir sem nada antes dela no stack (link direto) — sem isso, sem jeito
          // de sair (06/10/2026, achado pelo Alysson).
          headerLeft: () => (
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
              hitSlop={10}
              className="h-8 w-8 items-center justify-center rounded-full bg-subtle"
            >
              <X size={15} color={colors.ink} />
            </Pressable>
          ),
        }}
      />
      <View className="flex-1">
        <Aurora />
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-7 px-6"
          contentContainerStyle={insets}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-wordmark text-xl text-ink">
              IRIS<Text style={{ color: colors.amber }}>a</Text>
            </Text>
            <Text className="font-body-bold text-xs text-dim">1 de 2</Text>
          </View>

          <View>
            <Text className="font-display text-[34px] leading-[36px] text-ink">
              COMO A GENTE{"\n"}
              <Text className="font-heading">TE CHAMA?</Text>
            </Text>
          </View>

          <View className="gap-2">
            <Text className="font-body-bold text-xs uppercase tracking-[0.08em] text-dim">
              Nome ou apelido
            </Text>
            <TextInput
              value={nome}
              onChangeText={(t) => setNome(t.slice(0, 20))}
              placeholder="Ex.: Lê"
              placeholderTextColor={colors.dim}
              className="border-b-2 pb-2 font-body-bold text-2xl text-ink"
              style={{ borderBottomColor: colors.ink }}
              maxLength={20}
            />
          </View>

          <View className="gap-2">
            <Text className="font-body-bold text-xs uppercase tracking-[0.08em] text-dim">
              Pronomes
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PRONOMES.map((p, i) => (
                <Chip key={p} label={p} active={pronomeIdx === i} onPress={() => escolherPronome(i)} />
              ))}
            </View>
            {pronomeIdx === 4 && (
              <TextInput
                value={outro}
                onChangeText={setOutro}
                placeholder="Escreva seus pronomes"
                placeholderTextColor={colors.dim}
                className="mt-1 rounded-2xl bg-subtle px-4 py-3 font-body text-[15px] text-ink"
              />
            )}
          </View>

          <View className="gap-2">
            <Text className="font-body-bold text-xs uppercase tracking-[0.08em] text-dim">
              Como o app escreve pra você
            </Text>
            <Segmented
              options={FORMA_OPCOES}
              value={String(forma) as "0" | "1" | "2"}
              onChange={(v) => setForma(Number(v) as Forma)}
            />
          </View>

          <View className="items-center gap-5 pt-2">
            <Text className="font-heading text-xl text-ink">{saudacao}</Text>
            <Pressable
              disabled={!podeContinuar}
              onPress={() =>
                router.push({
                  pathname: "/irise-preview/escolha",
                  params: { nome: nome.trim(), forma: String(forma) },
                })
              }
              className="h-[54px] w-full items-center justify-center rounded-full active:opacity-85"
              style={{ backgroundColor: podeContinuar ? colors.ink : colors.border }}
            >
              <Text
                className="font-body-bold text-[15px]"
                style={{ color: podeContinuar ? colors.paper : colors.dim }}
              >
                Continuar ›
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
