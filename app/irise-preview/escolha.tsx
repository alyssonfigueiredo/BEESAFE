import { router, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { Aurora } from "@/components/Aurora";
import { Glass } from "@/components/Glass";
import { Busto } from "@/components/irise-personagem/Busto";
import { IriseAvatar } from "@/components/irise-personagem/IriseAvatar";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { useSetIrisePersonagem } from "@/hooks/useProfile";
import { IRISES, STATS, type Forma } from "@/lib/irisePersonagens";
import { colors, mark } from "@/theme/tokens";

const HERO = 250; // protótipo aprovado 10/10/2026: busto grande pra ver rosto, cabelo e roupa
const VIZINHO = 120;
const LIMITE_ARRASTE = 40;

/**
 * Escolha seu irise. Busto grande saindo do círculo com anel arco-íris, brilho arco-íris pulsando
 * atrás, vizinhos em cinza nas laterais. Troca por setas, por arrastar ou pelas miniaturas.
 */
export default function IrisePreviewEscolha() {
  const insets = useScreenInsets({ tabs: false });
  const { nome, forma: formaParam, modo, atual: atualParam } = useLocalSearchParams<{
    nome: string;
    forma: string;
    modo: string;
    atual: string;
  }>();
  const forma = (Number(formaParam ?? 2) || 2) as Forma;
  const doPerfil = modo === "perfil";
  const setPersonagem = useSetIrisePersonagem();
  const [indice, setIndice] = useState(() => {
    const i = IRISES.findIndex((p) => p.n === Number(atualParam));
    return i >= 0 ? i : 0;
  });

  const total = IRISES.length;
  const mover = (d: number) => setIndice((i) => (i + d + total) % total);
  const atual = IRISES[indice];
  const anterior = IRISES[(indice - 1 + total) % total];
  const proximo = IRISES[(indice + 1) % total];

  // Acompanha o dedo em tempo real (até uma folga) e volta suave no solta — em vez de só
  // disparar a troca na hora que passa o limite, sem nada acontecer até lá.
  const dragX = useSharedValue(0);
  const FOLGA_ARRASTE = 70;
  const arraste = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderMove: (_, g) => {
          dragX.set(Math.max(-FOLGA_ARRASTE, Math.min(FOLGA_ARRASTE, g.dx)));
        },
        onPanResponderRelease: (_, g) => {
          dragX.set(withSpring(0, { damping: 16, stiffness: 180 }));
          if (g.dx <= -LIMITE_ARRASTE) mover(1);
          else if (g.dx >= LIMITE_ARRASTE) mover(-1);
        },
        onPanResponderTerminate: () => {
          dragX.set(withSpring(0, { damping: 16, stiffness: 180 }));
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total],
  );
  const estiloArraste = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.get() }] }));

  const pulso = useSharedValue(0);
  useEffect(() => {
    pulso.set(withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }), -1, true));
  }, [pulso]);
  const estiloBrilho = useAnimatedStyle(() => ({
    opacity: 0.55 + pulso.get() * 0.35,
    transform: [{ scale: 0.94 + pulso.get() * 0.1 }],
  }));

  const BRILHO = HERO * 1.35;

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
          <Text className="font-body-bold text-[11px] uppercase tracking-[0.14em] text-turquoiseInk">
            Fase 2 de 2 · Seu parceiro de jogo
          </Text>
          <View className="flex-row items-end justify-between">
            <Text className="font-display text-[32px] text-ink">ESCOLHA SEU IRISE</Text>
            <Text className="font-body-bold text-sm text-dim">
              {indice + 1}/{total}
            </Text>
          </View>
        </View>

        <View
          {...arraste.panHandlers}
          style={{ height: HERO * 1.24 + 16, marginTop: 6 }}
          className="items-center justify-end"
        >
          <Animated.View
            pointerEvents="none"
            style={[
              { position: "absolute", width: BRILHO, height: BRILHO, bottom: HERO / 2 - BRILHO / 2 + 8 },
              estiloBrilho,
            ]}
          >
            <Svg width={BRILHO} height={BRILHO}>
              <Defs>
                <RadialGradient id="brilho" cx="50%" cy="50%" r="50%">
                  <Stop offset="0.35" stopColor={mark.ring[5]} stopOpacity={0.55} />
                  <Stop offset="0.6" stopColor={mark.ring[3]} stopOpacity={0.3} />
                  <Stop offset="0.8" stopColor={mark.ring[1]} stopOpacity={0.15} />
                  <Stop offset="1" stopColor={mark.ring[0]} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={BRILHO} height={BRILHO} fill="url(#brilho)" />
            </Svg>
          </Animated.View>

          <Animated.View
            pointerEvents="box-none"
            style={[{ alignItems: "center", justifyContent: "flex-end" }, estiloArraste]}
          >
            <Pressable
              onPress={() => mover(-1)}
              style={{ position: "absolute", left: -VIZINHO * 0.45, bottom: 30 }}
            >
              <Animated.View key={anterior.n} entering={FadeIn.duration(260)} exiting={FadeOut.duration(180)}>
                <IriseAvatar personagem={anterior.n} size={VIZINHO} cinza />
              </Animated.View>
            </Pressable>
            <Pressable
              onPress={() => mover(1)}
              style={{ position: "absolute", right: -VIZINHO * 0.45, bottom: 30 }}
            >
              <Animated.View key={proximo.n} entering={FadeIn.duration(260)} exiting={FadeOut.duration(180)}>
                <IriseAvatar personagem={proximo.n} size={VIZINHO} cinza />
              </Animated.View>
            </Pressable>

            <Animated.View
              key={atual.n}
              entering={FadeIn.duration(380)}
              exiting={FadeOut.duration(220)}
              style={{ marginBottom: 8 }}
            >
              <IriseAvatar personagem={atual.n} size={HERO} />
            </Animated.View>
          </Animated.View>

          <Pressable
            onPress={() => mover(-1)}
            hitSlop={8}
            className="absolute left-4 z-10 h-[46px] w-[46px] items-center justify-center rounded-full bg-solid active:opacity-80"
            style={{ bottom: HERO / 2 - 15, boxShadow: "0 4px 14px rgba(20,24,41,0.14)" }}
          >
            <ChevronLeft size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => mover(1)}
            hitSlop={8}
            className="absolute right-4 z-10 h-[46px] w-[46px] items-center justify-center rounded-full bg-solid active:opacity-80"
            style={{ bottom: HERO / 2 - 15, boxShadow: "0 4px 14px rgba(20,24,41,0.14)" }}
          >
            <ChevronRight size={20} color={colors.ink} />
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
                  transform: [{ scale: i === indice ? 1.12 : 1 }],
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
            <Text className="font-display text-[34px] text-ink">{atual.nome.toUpperCase()}</Text>
            <View className="mt-1 flex-row flex-wrap gap-2">
              <View className="rounded-full px-3 py-1" style={{ backgroundColor: colors.yellow }}>
                <Text className="font-body-bold text-[11px] uppercase text-ink">{atual.pronomes}</Text>
              </View>
              <View className="rounded-full bg-subtle px-3 py-1">
                <Text className="font-body-bold text-[11px] uppercase text-yellowInk">{atual.classe}</Text>
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
                        style={{ backgroundColor: seg < atual.stats[i] ? s.color : colors.border }}
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
            className="mt-5 h-[54px] items-center justify-center rounded-full active:opacity-85 active:scale-[0.98]"
            style={{ backgroundColor: colors.turquoise }}
          >
            <Text className="font-display text-[19px] text-ink">
              {doPerfil ? "USAR" : "ESCOLHER"} {atual.nome.toUpperCase()}
            </Text>
          </Pressable>
        </Glass>
      </View>
    </>
  );
}
