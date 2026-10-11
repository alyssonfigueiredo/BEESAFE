import { router, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Image, PanResponder, Pressable, Text, useWindowDimensions, View } from "react-native";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Aurora } from "@/components/Aurora";
import { Glass } from "@/components/Glass";
import { IriseAvatar } from "@/components/irise-personagem/IriseAvatar";
import { useIrisePersonagens } from "@/hooks/useIrisePersonagens";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { useProfile, useSetIrisePersonagem } from "@/hooks/useProfile";
import { STATS, type Forma } from "@/lib/irisePersonagens";
import { colors } from "@/theme/tokens";

const HERO = 250; // referência aprovada; respostas do pacote 14: fica 250, encolhe só se faltar espaço
const BASE = 28; // distância da base do avatar até o fim do palco (referência do pacote 13)
const ANEL_MIN = 140; // nunca encolhe além disso
const BRILHO = 520; // PNG com desfoque nas bordas; o miolo colorido fica ~290, igual ao protótipo
const ESPACAMENTO = 168; // distância entre o centro de cada personagem no carrossel
const DURACAO_CARROSSEL = 500;
const CURVA_CARROSSEL = Easing.bezier(0.2, 0.7, 0.2, 1);
const BRILHO_ARCOIRIS = require("../../assets/irise-personagens/brilho-arcoiris.png");

/** Menor distância circular entre dois índices (ex.: do último pro primeiro é +1, não -8). */
function distanciaCircular(off: number, total: number) {
  "worklet";
  return off - total * Math.round(off / total);
}

/**
 * Escolha seu irise. Carrossel de verdade: os personagens ficam sempre montados, cada um numa
 * posição/escala/opacidade calculada pela distância até o selecionado — ao trocar, todo mundo
 * desliza e muda de tamanho junto. Sem fileira de miniaturas (decisão do design, pacote 14):
 * o cartão flutua a 12 pt + área segura e o busto fica em 250, encolhendo só se a tela for curta.
 */
export default function IrisePreviewEscolha() {
  const insets = useScreenInsets({ tabs: false });
  const safe = useSafeAreaInsets();
  const { height: alturaTela } = useWindowDimensions();
  const { nome, forma: formaParam, modo, atual: atualParam, primeiraVez } = useLocalSearchParams<{
    nome: string;
    forma: string;
    modo: string;
    atual: string;
    primeiraVez: string;
  }>();
  // Forma 0 ("a") é válida: `Number("0") || 2` virava 2 e trocava "bem-vinda" por "bem-vinde".
  const formaN = Number(formaParam);
  const forma = (formaN === 0 || formaN === 1 ? formaN : 2) as Forma;
  const doPerfil = modo === "perfil";
  const setPersonagem = useSetIrisePersonagem();
  const { data: profile } = useProfile();
  const { data: todos = [] } = useIrisePersonagens();
  // Personagem desativado não deve entrar como opção nova no carrossel — mas quem já tinha
  // escolhido um continua vendo o seu (a RLS devolve esse inativo, migration 73).
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

  // Resposta do design (dúvida 1): o busto fica em 250 e o cartão flutua; se mesmo sem as
  // miniaturas a tela for curta pro cartão inteiro, o busto encolhe só até caber.
  const [cardAltura, setCardAltura] = useState(0);
  const [palcoTopo, setPalcoTopo] = useState(0);
  const margemCard = 12 + safe.bottom;
  const hero =
    cardAltura > 0 && palcoTopo > 0
      ? Math.max(
          ANEL_MIN,
          // A base do avatar fica BASE acima do fim do palco; esse respiro vazio pode ficar atrás
          // do cartão, então a conta vai até a base do busto, não até o fim do palco.
          Math.min(HERO, Math.floor((alturaTela - margemCard - cardAltura - 6 - palcoTopo) / 1.3)),
        )
      : HERO;

  // Posição contínua do carrossel (pode passar de 0/total — o wrap acontece por item, no render).
  const indiceSV = useSharedValue(indice);

  function mover(d: number) {
    setIndice((i) => (i + d + total) % total);
    indiceSV.set(withTiming(indiceSV.get() + d, { duration: DURACAO_CARROSSEL, easing: CURVA_CARROSSEL }));
  }

  // Arraste: a posição do carrossel segue o dedo 1:1 (mantido pela resposta da dúvida 4);
  // ao soltar, encaixa no personagem mais próximo.
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
        <View
          style={{ paddingTop: insets.paddingTop, paddingHorizontal: 20 }}
          className="flex-row items-start justify-between"
        >
          <View>
            <Text className="font-body-bold text-[11px] uppercase tracking-[0.14em] text-turquoiseInk">
              Fase 2 de 2 · Seu parceiro de jogo
            </Text>
            <Text className="mt-1.5 text-[32px] text-ink" style={{ lineHeight: 34 }}>
              <Text className="font-heading">ESCOLHA </Text>
              <Text className="font-display">SEU IRISE</Text>
            </Text>
          </View>
          <Text className="font-display text-[15px]" style={{ color: "#8E96AE", marginTop: 22 }}>
            {indiceSeguro + 1}/{total}
          </Text>
        </View>

        <View
          {...arraste.panHandlers}
          onLayout={(e) => setPalcoTopo(e.nativeEvent.layout.y)}
          style={{ height: hero * 1.3 + BASE, marginTop: 6 }}
          className="items-center"
        >
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: "50%",
                marginLeft: -BRILHO / 2,
                bottom: BASE + hero / 2 - BRILHO / 2,
                width: BRILHO,
                height: BRILHO,
              },
              estiloBrilho,
            ]}
          >
            <Image source={BRILHO_ARCOIRIS} style={{ width: BRILHO, height: BRILHO }} />
          </Animated.View>

          {irises.map((p, i) => {
            const off = distanciaCircular(i - indiceSeguro, total);
            return (
              <CarrosselAvatar
                key={p.n}
                i={i}
                total={total}
                personagem={p.n}
                hero={hero}
                indiceSV={indiceSV}
                tocavel={Math.abs(off) === 1}
                onPress={() => mover(off)}
              />
            );
          })}

          <Seta lado="esq" onPress={() => mover(-1)} />
          <Seta lado="dir" onPress={() => mover(1)} />
        </View>

        <View
          onLayout={(e) => setCardAltura(e.nativeEvent.layout.height)}
          style={{ position: "absolute", left: 12, right: 12, bottom: margemCard }}
        >
          <Glass
            tint="strong"
            style={{ borderRadius: 38, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16 }}
          >
            <Animated.View key={atual.n} entering={FadeIn.duration(220)}>
              <View className="flex-row items-baseline" style={{ gap: 10 }}>
                <Text className="font-display text-[34px] text-ink" style={{ lineHeight: 36 }}>
                  {atual.nome.toUpperCase()}
                </Text>
                <View
                  style={{
                    height: 24,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    backgroundColor: colors.subtle,
                    justifyContent: "center",
                  }}
                >
                  <Text className="font-body-bold text-[12px] text-muted">{atual.pronomes}</Text>
                </View>
                <Text className="ml-auto font-body-bold text-[11px] uppercase tracking-[0.14em] text-yellowInk">
                  {atual.classe}
                </Text>
              </View>
              <Text
                className="font-body text-[13.5px] text-muted"
                style={{ marginTop: 8, lineHeight: 19.5, minHeight: 39 }}
              >
                {atual.bio}
              </Text>

              <View className="flex-row flex-wrap" style={{ marginTop: 12, rowGap: 9, columnGap: 16 }}>
                {STATS.map((s, i) => (
                  <View key={s.key} style={{ width: "47%" }}>
                    <Text className="font-body-bold text-[11px] uppercase tracking-[0.08em] text-dim">
                      {s.label}
                    </Text>
                    <View className="flex-row" style={{ gap: 3, marginTop: 5 }}>
                      {Array.from({ length: 5 }).map((_, seg) => (
                        <View
                          key={seg}
                          style={{
                            flex: 1,
                            height: 8,
                            borderRadius: 2,
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
              className="items-center justify-center active:opacity-85 active:scale-[0.98]"
              style={{
                marginTop: 16,
                height: 54,
                borderRadius: 27,
                backgroundColor: colors.turquoise,
                boxShadow: "0 8px 24px rgba(73,220,192,0.35)",
              }}
            >
              <Text className="font-display text-[19px] text-ink" style={{ letterSpacing: 0.76 }}>
                {doPerfil ? "USAR" : "ESCOLHER"} {atual.nome.toUpperCase()}
              </Text>
            </Pressable>
          </Glass>
        </View>
      </View>
    </>
  );
}

/**
 * Um personagem do carrossel: sempre montado, posição/escala/opacidade calculadas pela distância
 * até o selecionado (`indiceSV`). O selecionado fica no centro em tamanho cheio; cada vizinho fica
 * `ESPACAMENTO`px pro lado, na metade do tamanho, com opacidade .5 e acinzentado; dois ou mais de
 * distância, invisível (mas ainda montado, pra transição ficar contínua).
 */
function CarrosselAvatar({
  i,
  total,
  personagem,
  hero,
  indiceSV,
  tocavel,
  onPress,
}: {
  i: number;
  total: number;
  personagem: number;
  hero: number;
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
  const estiloCinza = useAnimatedStyle(() => {
    const a = Math.min(Math.abs(distanciaCircular(i - indiceSV.get(), total)), 1);
    return { opacity: a };
  });
  return (
    <Animated.View
      pointerEvents={tocavel ? "auto" : "none"}
      style={[
        {
          position: "absolute",
          left: "50%",
          bottom: BASE,
          marginLeft: -hero / 2,
          width: hero,
          height: hero * 1.3,
          transformOrigin: "50% 100%",
        },
        estilo,
      ]}
    >
      <Pressable onPress={onPress} disabled={!tocavel} style={{ width: hero, height: hero * 1.3 }}>
        <IriseAvatar personagem={personagem} size={hero} />
        {/* Vizinho acinzentado: a mesma imagem tingida por cima (tintColor), que some ao centrar. */}
        <Animated.View
          pointerEvents="none"
          style={[{ position: "absolute", top: 0, left: 0, width: hero, height: hero * 1.3 }, estiloCinza]}
        >
          <IriseAvatar personagem={personagem} size={hero} cinza />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

function Seta({ lado, onPress }: { lado: "esq" | "dir"; onPress: () => void }) {
  const Icone = lado === "esq" ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      className="active:opacity-80"
      style={{ position: "absolute", top: 150, [lado === "esq" ? "left" : "right"]: 14, zIndex: 20 }}
    >
      <Glass tint="strong" style={{ width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" }}>
        <Icone size={20} strokeWidth={2.4} color={colors.ink} />
      </Glass>
    </Pressable>
  );
}
