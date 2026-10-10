import { router, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { PanResponder, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { Aurora } from "@/components/Aurora";
import { Glass } from "@/components/Glass";
import { Busto } from "@/components/irise-personagem/Busto";
import { IriseAvatar } from "@/components/irise-personagem/IriseAvatar";
import { useIrisePersonagens } from "@/hooks/useIrisePersonagens";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { useProfile, useSetIrisePersonagem } from "@/hooks/useProfile";
import { STATS, type Forma } from "@/lib/irisePersonagens";
import { colors, mark } from "@/theme/tokens";

const HERO = 250; // protótipo aprovado 10/10/2026: busto grande pra ver rosto, cabelo e roupa
const ESPACAMENTO = 168; // distância entre o centro de cada personagem no carrossel (mesmo valor do protótipo)
const DURACAO_CARROSSEL = 500;
const CURVA_CARROSSEL = Easing.bezier(0.2, 0.7, 0.2, 1);

/** Menor distância circular entre dois índices (ex.: do último pro primeiro é +1, não -8). */
function distanciaCircular(off: number, total: number) {
  "worklet";
  return off - total * Math.round(off / total);
}

/**
 * Escolha seu irise. Carrossel de verdade: os 9 personagens ficam sempre montados, cada um numa
 * posição/escala/opacidade calculada pela distância até o selecionado — ao trocar, todo mundo
 * desliza e muda de tamanho junto (protótipo aprovado), em vez de só aparecer/sumir no lugar.
 */
export default function IrisePreviewEscolha() {
  const insets = useScreenInsets({ tabs: false });
  const { nome, forma: formaParam, modo, atual: atualParam, primeiraVez } = useLocalSearchParams<{
    nome: string;
    forma: string;
    modo: string;
    atual: string;
    primeiraVez: string;
  }>();
  const forma = (Number(formaParam ?? 2) || 2) as Forma;
  const doPerfil = modo === "perfil";
  const setPersonagem = useSetIrisePersonagem();
  const { data: profile } = useProfile();
  const { data: todos = [] } = useIrisePersonagens();
  // Personagem desativado não deve entrar como opção nova no carrossel — mas quem já tinha
  // escolhido um continua vendo o seu (não "perde" o personagem de repente).
  // Nota: hoje a RLS de `irise_personagens` já só devolve os ativos pra leitura comum (`using
  // (ativo)`), então na prática `todos` nunca chega a trazer um inativo — este filtro é a regra
  // certa se isso mudar, mas sozinho não resolve quem JÁ tem um personagem inativo escolhido: esse
  // caso seguiria sem aparecer em lugar nenhum do app (seção E da revisão, sinalizado à parte).
  const irises = useMemo(
    () => todos.filter((p) => p.ativo || p.n === profile?.irise_personagem),
    [todos, profile?.irise_personagem],
  );
  const [indice, setIndice] = useState(() => {
    const i = irises.findIndex((p) => p.n === Number(atualParam));
    return i >= 0 ? i : 0;
  });

  const total = irises.length;
  // O catálogo pode encolher (admin apaga um personagem) enquanto a tela já estava aberta — trava
  // num índice válido em vez de quebrar.
  const indiceSeguro = total > 0 ? Math.min(indice, total - 1) : 0;
  // Os 9 originais garantem que a lista nunca chega vazia (placeholderData) — o reserva aqui é só
  // pro TypeScript não reclamar de undefined, não deve aparecer na prática.
  const atual = irises[indiceSeguro] ?? {
    n: 0,
    nome: "",
    pronomes: "",
    classe: "",
    bio: "",
    stats: [0, 0, 0, 0] as [number, number, number, number],
  };

  // Posição contínua do carrossel (pode passar de 0/total — o wrap acontece por item, no render).
  const indiceSV = useSharedValue(indice);

  function mover(d: number) {
    setIndice((i) => (i + d + total) % total);
    indiceSV.set(withTiming(indiceSV.get() + d, { duration: DURACAO_CARROSSEL, easing: CURVA_CARROSSEL }));
  }

  function irPara(i: number) {
    const delta = distanciaCircular(i - indice, total);
    setIndice(i);
    indiceSV.set(withTiming(indiceSV.get() + delta, { duration: DURACAO_CARROSSEL, easing: CURVA_CARROSSEL }));
  }

  // Arraste: a posição do carrossel segue o dedo 1:1 (sem clamp — é um carrossel de verdade, não
  // um "puxa e volta"); ao soltar, encaixa no personagem mais próximo.
  const dragBase = useSharedValue(0);
  const arraste = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          dragBase.set(indiceSV.get());
        },
        onPanResponderMove: (_, g) => {
          indiceSV.set(dragBase.get() - g.dx / ESPACAMENTO);
        },
        onPanResponderRelease: () => {
          const alvo = Math.round(indiceSV.get());
          indiceSV.set(withTiming(alvo, { duration: 320, easing: CURVA_CARROSSEL }));
          setIndice(((alvo % total) + total) % total);
        },
        onPanResponderTerminate: () => {
          const alvo = Math.round(indiceSV.get());
          indiceSV.set(withTiming(alvo, { duration: 320, easing: CURVA_CARROSSEL }));
          setIndice(((alvo % total) + total) % total);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [total],
  );

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
              {indiceSeguro + 1}/{total}
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

          {irises.map((p, i) => {
            const off = distanciaCircular(i - indiceSeguro, total);
            return (
              <CarrosselAvatar
                key={p.n}
                i={i}
                total={total}
                personagem={p.n}
                indiceSV={indiceSV}
                tocavel={Math.abs(off) === 1}
                onPress={() => mover(off)}
              />
            );
          })}

          <Pressable
            onPress={() => mover(-1)}
            hitSlop={8}
            className="absolute left-4 z-20 h-[46px] w-[46px] items-center justify-center rounded-full bg-solid active:opacity-80"
            style={{ bottom: HERO / 2 - 15, boxShadow: "0 4px 14px rgba(20,24,41,0.14)" }}
          >
            <ChevronLeft size={20} color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => mover(1)}
            hitSlop={8}
            className="absolute right-4 z-20 h-[46px] w-[46px] items-center justify-center rounded-full bg-solid active:opacity-80"
            style={{ bottom: HERO / 2 - 15, boxShadow: "0 4px 14px rgba(20,24,41,0.14)" }}
          >
            <ChevronRight size={20} color={colors.ink} />
          </Pressable>
        </View>

        <View className="flex-row justify-center gap-2 py-3">
          {irises.map((p, i) => (
            <Miniatura key={p.n} personagem={p.n} selecionada={i === indiceSeguro} onPress={() => irPara(i)} />
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
            <Text className="font-display text-[34px] text-ink">{atual.nome}</Text>
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
                setPersonagem.mutate(atual.n, {
                  onSuccess: () => {
                    if (primeiraVez) {
                      // Primeira escolha: mostra a apresentação do irise em vez de só voltar
                      // calado. `replace` (não `push`) pra fechar/voltar da apresentação já cair
                      // direto no Perfil, sem passar de novo por esta tela.
                      router.replace({
                        pathname: "/irise-preview/apresentacao",
                        params: { nome: profile?.nickname ?? "", forma: String(forma), irise: String(atual.n) },
                      });
                    } else {
                      router.back();
                    }
                  },
                });
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
              {doPerfil ? "Usar" : "Escolher"} {atual.nome}
            </Text>
          </Pressable>
        </Glass>
      </View>
    </>
  );
}

/**
 * Um personagem do carrossel: sempre montado, posição/escala/opacidade calculadas pela distância
 * até o selecionado (`indiceSV`). O selecionado fica no centro em tamanho cheio; cada vizinho fica
 * `ESPACAMENTO`px pro lado e na metade do tamanho; dois ou mais de distância, invisível (mas ainda
 * montado, pra a transição ficar contínua em vez de aparecer do nada).
 */
function CarrosselAvatar({
  i,
  total,
  personagem,
  indiceSV,
  tocavel,
  onPress,
}: {
  i: number;
  total: number;
  personagem: number;
  indiceSV: SharedValue<number>;
  tocavel: boolean;
  onPress: () => void;
}) {
  const estilo = useAnimatedStyle(() => {
    const off = distanciaCircular(i - indiceSV.get(), total);
    const a = Math.min(Math.abs(off), 2);
    return {
      opacity: interpolate(a, [0, 1, 2], [1, 0.5, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: off * ESPACAMENTO },
        { scale: interpolate(a, [0, 1], [1, 0.5], Extrapolation.CLAMP) },
      ],
      zIndex: Math.round(10 - a),
    };
  });
  return (
    <Animated.View
      pointerEvents={tocavel ? "auto" : "none"}
      style={[
        {
          position: "absolute",
          left: "50%",
          bottom: 0,
          marginLeft: -HERO / 2,
          width: HERO,
          height: HERO * 1.24,
          transformOrigin: "50% 100%",
        },
        estilo,
      ]}
    >
      <Pressable onPress={onPress} disabled={!tocavel} style={{ width: "100%", height: "100%" }}>
        <IriseAvatar personagem={personagem} size={HERO} />
      </Pressable>
    </Animated.View>
  );
}

/** Miniatura da fileira: anel, opacidade e escala animam ao trocar de selecionada, em vez de pular. */
function Miniatura({
  personagem,
  selecionada,
  onPress,
}: {
  personagem: number;
  selecionada: boolean;
  onPress: () => void;
}) {
  const estilo = useAnimatedStyle(() => ({
    borderWidth: withTiming(selecionada ? 2 : 0, { duration: 220 }),
    opacity: withTiming(selecionada ? 1 : 0.6, { duration: 220 }),
    transform: [{ scale: withTiming(selecionada ? 1.12 : 1, { duration: 220 }) }],
  }));
  return (
    <Pressable onPress={onPress} hitSlop={4}>
      <Animated.View style={[{ borderRadius: 18, borderColor: colors.turquoiseInk }, estilo]}>
        <Busto personagem={personagem} size={32} />
      </Animated.View>
    </Pressable>
  );
}
