import { router, Stack, useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { Aurora } from "@/components/Aurora";
import { Glass } from "@/components/Glass";
import { Busto } from "@/components/irise-personagem/Busto";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { useSetIrisePersonagem } from "@/hooks/useProfile";
import { IRISES, STATS, type Forma } from "@/lib/irisePersonagens";
import { colors } from "@/theme/tokens";

const { width: TELA_W } = Dimensions.get("window");
const ITEM_W = TELA_W; // uma página por personagem, com os vizinhos espiando pela escala/opacidade
const HERO = 192; // diâmetro do busto em destaque

/**
 * Prévia do personagem do irise — tela 2 de 2 (escolha). Carrossel de bustos (não corpo inteiro:
 * o busto é o que aparece em todo lugar, então é o que precisa representar bem o personagem aqui).
 * A folha de baixo não rola — cabe tudo (nome, pronome, classe, bio e atributos). Protótipo: nada
 * grava além do personagem escolhido.
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
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [indice, setIndice] = useState(() => {
    const n = Number(atualParam);
    const i = IRISES.findIndex((p) => p.n === n);
    return i >= 0 ? i : 0;
  });

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });

  function irPara(i: number) {
    const alvo = Math.max(0, Math.min(IRISES.length - 1, i));
    scrollRef.current?.scrollTo({ x: alvo * ITEM_W, animated: true });
  }

  // Abriu já num personagem (ex.: trocar no Perfil, no que a pessoa já tem): pula pra ele sem animar.
  useEffect(() => {
    if (indice > 0) scrollRef.current?.scrollTo({ x: indice * ITEM_W, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={(e) =>
            setIndice(Math.round(e.nativeEvent.contentOffset.x / ITEM_W))
          }
          scrollEventThrottle={16}
          style={{ height: HERO + 24, marginTop: 10 }}
        >
          {IRISES.map((p, i) => (
            <Personagem key={p.n} i={i} scrollX={scrollX} personagem={p.n} />
          ))}
        </Animated.ScrollView>

        <View className="flex-row justify-center gap-2.5 py-3">
          {IRISES.map((p, i) => (
            <Pressable key={p.n} onPress={() => irPara(i)} hitSlop={4}>
              <View
                style={{
                  borderRadius: 24,
                  borderWidth: i === indice ? 2.5 : 0,
                  borderColor: colors.turquoiseInk,
                  transform: [{ scale: i === indice ? 1.1 : 1 }],
                }}
              >
                <Busto personagem={p.n} size={44} />
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

function Personagem({
  i,
  scrollX,
  personagem,
}: {
  i: number;
  scrollX: SharedValue<number>;
  personagem: number;
}) {
  const estilo = useAnimatedStyle(() => {
    const pos = i * ITEM_W;
    const d = scrollX.get() - pos;
    const escala = interpolate(d, [-ITEM_W, 0, ITEM_W], [0.72, 1, 0.72], "clamp");
    const opacidade = interpolate(d, [-ITEM_W, 0, ITEM_W], [0.4, 1, 0.4], "clamp");
    return { transform: [{ scale: escala }], opacity: opacidade };
  });
  return (
    <View style={{ width: ITEM_W, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={estilo}>
        <Busto personagem={personagem} size={HERO} />
      </Animated.View>
    </View>
  );
}
