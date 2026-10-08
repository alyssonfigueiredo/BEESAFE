import { router, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Aurora } from "@/components/Aurora";
import { Glass } from "@/components/Glass";
import { Busto } from "@/components/irise-personagem/Busto";
import { HeroAvatar } from "@/components/irise-personagem/HeroAvatar";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { useSetIrisePersonagem } from "@/hooks/useProfile";
import { IRISES, STATS, type Forma } from "@/lib/irisePersonagens";
import { colors } from "@/theme/tokens";

const HERO = 150; // diâmetro do avatar em destaque — igual ao protótipo aprovado

/**
 * Prévia do personagem do irise — tela 2 de 2 (escolha). Avatar grande (disco branco + anel
 * arco-íris) no centro, setas pros lados pra trocar, fileira de miniaturas embaixo. A folha de
 * baixo não rola — cabe tudo (nome, pronome, classe, bio e atributos). Protótipo: nada grava além
 * do personagem escolhido.
 */
export default function IrisePreviewEscolha() {
  const insets = useScreenInsets({ tabs: false });
  const { nome, forma: formaParam, modo, atual: atualParam } = useLocalSearchParams<{
    nome: string;
    forma: string;
    /** "perfil": veio de Trocar irise no Perfil — escolher só salva e volta, sem apresentação. */
    modo: string;
    atual: string;
  }>();
  const forma = (Number(formaParam ?? 2) || 2) as Forma;
  const doPerfil = modo === "perfil";
  const setPersonagem = useSetIrisePersonagem();
  const [indice, setIndice] = useState(() => {
    const n = Number(atualParam);
    const i = IRISES.findIndex((p) => p.n === n);
    return i >= 0 ? i : 0;
  });

  function mover(d: number) {
    setIndice((i) => (i + d + IRISES.length) % IRISES.length);
  }

  const atual = IRISES[indice];

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
        <View style={{ paddingTop: insets.paddingTop }} className="gap-1 px-6">
          <Text className="font-body-bold text-[11px] uppercase tracking-[0.1em] text-turquoiseInk">
            Fase 2 de 2 · Seu parceiro de jogo
          </Text>
          <View className="flex-row items-end justify-between">
            <Text className="font-display text-[26px] text-ink">ESCOLHA SEU IRISE</Text>
            <Text className="font-body-bold text-sm text-dim">
              {indice + 1}/{IRISES.length}
            </Text>
          </View>
        </View>

        <View style={{ height: HERO + 24, marginTop: 10 }} className="flex-row items-center justify-center">
          <Pressable
            onPress={() => mover(-1)}
            hitSlop={8}
            className="absolute left-5 z-10 h-[38px] w-[38px] items-center justify-center rounded-full bg-solid active:opacity-80"
            style={{ boxShadow: "0 4px 14px rgba(20,24,41,0.14)" }}
          >
            <ChevronLeft size={18} color={colors.ink} />
          </Pressable>
          <Animated.View key={atual.n} entering={FadeIn.duration(200)}>
            <HeroAvatar personagem={atual.n} size={HERO} />
          </Animated.View>
          <Pressable
            onPress={() => mover(1)}
            hitSlop={8}
            className="absolute right-5 z-10 h-[38px] w-[38px] items-center justify-center rounded-full bg-solid active:opacity-80"
            style={{ boxShadow: "0 4px 14px rgba(20,24,41,0.14)" }}
          >
            <ChevronRight size={18} color={colors.ink} />
          </Pressable>
        </View>

        <View className="flex-row justify-center gap-2 py-3">
          {IRISES.map((p, i) => (
            <Pressable key={p.n} onPress={() => setIndice(i)} hitSlop={4}>
              <View
                style={{
                  borderRadius: 18,
                  borderWidth: i === indice ? 2 : 0,
                  borderColor: colors.turquoiseInk,
                  opacity: i === indice ? 1 : 0.6,
                  transform: [{ scale: i === indice ? 1.08 : 1 }],
                }}
              >
                <Busto personagem={p.n} size={32} />
              </View>
            </Pressable>
          ))}
        </View>

        <Glass
          tint="strong"
          style={{
            borderTopLeftRadius: 38,
            borderTopRightRadius: 38,
            paddingHorizontal: 22,
            paddingTop: 18,
            paddingBottom: Math.max(16, insets.paddingBottom),
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <Animated.View key={atual.n} entering={FadeIn.duration(220)}>
            <View className="flex-row items-center gap-2">
              <Text className="font-display text-[26px] text-ink">{atual.nome.toUpperCase()}</Text>
            </View>
            <View className="mt-1 flex-row flex-wrap gap-2">
              <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.yellow }}>
                <Text className="font-body-bold text-[11px] uppercase text-ink">{atual.pronomes}</Text>
              </View>
              <View className="rounded-full bg-subtle px-3 py-1">
                <Text className="font-body-bold text-[11px] uppercase text-muted">{atual.classe}</Text>
              </View>
            </View>
            <Text className="mt-3 font-body text-[13.5px] leading-[19px] text-muted">{atual.bio}</Text>

            <View className="mt-4 flex-row flex-wrap gap-x-6 gap-y-3">
              {STATS.map((s, i) => (
                <View key={s.key} style={{ width: "42%" }}>
                  <Text className="mb-1 font-body-bold text-[11px] text-dim">{s.label}</Text>
                  <View className="flex-row gap-1">
                    {Array.from({ length: 5 }).map((_, seg) => (
                      <View
                        key={seg}
                        className="h-[8px] flex-1 rounded-full"
                        style={{
                          backgroundColor: seg < atual.stats[i] ? s.color : colors.border,
                        }}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>

          <Pressable
            disabled={setPersonagem.isPending}
            onPress={() => {
              if (doPerfil) {
                setPersonagem.mutate(atual.n, { onSuccess: () => router.back() });
                return;
              }
              router.push({
                pathname: "/irise-preview/apresentacao",
                params: { nome, forma: String(forma), irise: String(atual.n) },
              });
            }}
            className="mt-5 h-[52px] items-center justify-center rounded-full active:opacity-85 active:scale-[0.98]"
            style={{ backgroundColor: colors.turquoise }}
          >
            <Text className="font-display text-[17px] text-ink">
              {doPerfil ? "USAR" : "ESCOLHER"} {atual.nome.toUpperCase()}
            </Text>
          </Pressable>
        </Glass>
      </View>
    </>
  );
}
