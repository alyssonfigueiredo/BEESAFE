import { router, Stack, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Dimensions, Image, Pressable, ScrollView, Text, View } from "react-native";
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { Aurora } from "@/components/Aurora";
import { Glass } from "@/components/Glass";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { corpoSrc, IRISES, STATS, type Forma } from "@/lib/irisePersonagens";
import { colors } from "@/theme/tokens";

const { width: TELA_W } = Dimensions.get("window");
const ITEM_W = TELA_W; // uma página por personagem, com os vizinhos espiando pela escala/opacidade

/**
 * Prévia do personagem do irise — tela 2 de 2 (escolha). Carrossel de 7 personagens; a folha de
 * baixo mostra nome, classe e atributos do personagem central. Protótipo: nada grava ainda.
 */
export default function IrisePreviewEscolha() {
  const insets = useScreenInsets({ tabs: false });
  const { nome, forma: formaParam } = useLocalSearchParams<{ nome: string; forma: string }>();
  const forma = (Number(formaParam ?? 2) || 2) as Forma;
  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [indice, setIndice] = useState(0);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.set(e.contentOffset.x);
  });

  function irPara(i: number) {
    const alvo = Math.max(0, Math.min(IRISES.length - 1, i));
    scrollRef.current?.scrollTo({ x: alvo * ITEM_W, animated: true });
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
            <Text className="font-body-bold text-sm text-dim">{indice + 1}/7</Text>
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
          style={{ height: 320, marginTop: 8 }}
        >
          {IRISES.map((p, i) => (
            <Personagem key={p.n} i={i} scrollX={scrollX} src={corpoSrc(1, p.n)} />
          ))}
        </Animated.ScrollView>

        <View className="flex-row justify-center gap-3 py-3">
          {IRISES.map((p, i) => (
            <Pressable key={p.n} onPress={() => irPara(i)}>
              <View
                className="h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-full"
                style={{
                  borderWidth: i === indice ? 2.5 : 0,
                  borderColor: colors.turquoiseInk,
                  backgroundColor: colors.subtle,
                  transform: [{ scale: i === indice ? 1.12 : 1 }],
                }}
              >
                <Image
                  source={corpoSrc(1, p.n)}
                  style={{ width: 60, height: 60, marginTop: 18 }}
                  resizeMode="cover"
                />
              </View>
            </Pressable>
          ))}
        </View>

        <Glass
          tint="strong"
          style={{
            borderTopLeftRadius: 38,
            borderTopRightRadius: 38,
            padding: 20,
            paddingBottom: insets.paddingBottom,
            flex: 1,
          }}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
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

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/irise-preview/apresentacao",
                  params: { nome, forma: String(forma), irise: String(atual.n) },
                })
              }
              className="mt-5 h-[52px] items-center justify-center rounded-full active:opacity-85"
              style={{ backgroundColor: colors.turquoise }}
            >
              <Text className="font-display text-[17px] text-ink">
                ESCOLHER {atual.nome.toUpperCase()}
              </Text>
            </Pressable>
          </ScrollView>
        </Glass>
      </View>
    </>
  );
}

function Personagem({
  i,
  scrollX,
  src,
}: {
  i: number;
  scrollX: SharedValue<number>;
  src: number;
}) {
  const estilo = useAnimatedStyle(() => {
    const pos = i * ITEM_W;
    const d = scrollX.get() - pos;
    const escala = interpolate(d, [-ITEM_W, 0, ITEM_W], [0.58, 1, 0.58], "clamp");
    const opacidade = interpolate(d, [-ITEM_W, 0, ITEM_W], [0.5, 1, 0.5], "clamp");
    return { transform: [{ scale: escala }], opacity: opacidade };
  });
  return (
    <View style={{ width: ITEM_W, alignItems: "center", justifyContent: "flex-end" }}>
      <Animated.Image
        source={src}
        style={[{ width: ITEM_W * 0.62, height: 320 }, estilo]}
        resizeMode="contain"
      />
    </View>
  );
}
