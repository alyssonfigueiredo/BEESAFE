import { router, Stack, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

import { Aurora } from "@/components/Aurora";
import { Counter, EASE, FadeUp, LiveDot, Segs, useSvgId } from "@/components/gami/Anim";
import { BoxModal } from "@/components/gami/BoxModal";
import { MedalDetail } from "@/components/gami/MedalDetail";
import { AnimatedMedal } from "@/components/gami/MedalView";
import {
  ctaDa,
  faltam,
  progressoTexto,
  proximas,
  quaseLa,
  unidadeTexto,
  useGamification,
  type Gamificacao,
  type MedalhaProgresso,
} from "@/hooks/useGamification";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { getMedalha, LANCAMENTO, nomeDa } from "@/lib/medals";
import { colors, shadow } from "@/theme/tokens";

const SOFT = "#C9CDE0";

/** Fundo do destaque: noite com um halo azul no alto à esquerda e um brilho quente que acende. */
function FundoHero({ w, h }: { w: number; h: number }) {
  const reduce = useReducedMotion();
  const bg = useSvgId("herobg");
  const gl = useSvgId("heroglow");
  const k = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) k.set(withDelay(200, withTiming(1, { duration: 1400, easing: EASE })));
  }, [reduce, k]);
  const glow = useAnimatedStyle(() => ({
    opacity: k.get(),
    transform: [{ scale: 0.7 + 0.3 * k.get() }],
  }));
  return (
    <>
      {w > 0 && h > 0 && (
        <Svg style={StyleSheet.absoluteFill} width={w} height={h}>
          <Defs>
            <RadialGradient id={bg} cx="15%" cy="0%" rx="90%" ry="70%" fx="15%" fy="0%">
              <Stop offset="0" stopColor="#2F3760" />
              <Stop offset="1" stopColor="#141829" />
            </RadialGradient>
          </Defs>
          <Rect width={w} height={h} fill={`url(#${bg})`} />
        </Svg>
      )}
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", left: -30, top: -20, width: 240, height: 240 }, glow]}
      >
        <Svg width={240} height={240}>
          <Defs>
            <RadialGradient id={gl} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={colors.yellow} stopOpacity={0.35} />
              <Stop offset="0.65" stopColor={colors.yellow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={240} height={240} fill={`url(#${gl})`} />
        </Svg>
      </Animated.View>
    </>
  );
}

function Hero({ q, g, onOpen }: { q: MedalhaProgresso; g: Gamificacao; onOpen: () => void }) {
  const m = getMedalha(q.id)!;
  const falta = faltam(q);
  const nSegs = Math.min(q.alvo, 30);
  const cta = ctaDa(q.id);
  // O fundo é medido: svg com 100% dentro de um cartão que cresce depois (contador, textos)
  // ficava do tamanho da primeira medida e deixava o cartão com uma faixa clara.
  const [box, setBox] = useState({ w: 0, h: 0 });
  return (
    <View className="rounded-[30px]" style={shadow.lift}>
      <Pressable
        onPress={onOpen}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
        }}
        className="overflow-hidden rounded-[30px] px-5 pb-[18px] pt-5"
        style={{ backgroundColor: "#141829" }}
      >
        <FundoHero w={box.w} h={box.h} />
        <View className="flex-row items-center gap-4">
          <AnimatedMedal
            id={q.id}
            size={104}
            prog={q.valor / q.alvo}
            delay={350}
            duration={1500}
            shine="once"
          />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <LiveDot color={colors.yellow} />
              <Text
                className="font-body-bold text-[11px] uppercase tracking-widest"
                style={{ color: colors.yellow }}
              >
                Quase lá
              </Text>
            </View>
            <Text className="mt-1.5 font-display text-[26px] uppercase leading-[31px] text-paper">
              {nomeDa(m, g.forma)}
            </Text>
            <Text className="mt-1 font-body text-[13px] leading-[18px]" style={{ color: SOFT }}>
              {m.cond}
            </Text>
          </View>
        </View>
        <View className="mt-4 flex-row items-center gap-2">
          <Counter
            value={falta}
            from={q.alvo}
            duration={900}
            delay={600}
            className="font-display text-[46px] text-paper"
            style={{ color: "#FFFFFF" }}
          />
          <Text className="flex-1 font-body text-[15px]" style={{ color: SOFT }}>
            {q.unidade ? `${unidadeTexto(q.unidade, falta)} ` : ""}para desbloquear
          </Text>
        </View>
        <Segs
          n={nSegs}
          lit={(q.valor / q.alvo) * nSegs}
          delay={600}
          step={55}
          track="rgba(255,255,255,0.14)"
          style={{ marginTop: 10 }}
        />
        <View className="mt-1.5 flex-row justify-between">
          <Text
            className="min-w-0 flex-1 font-body text-[12px]"
            style={{ color: SOFT }}
            numberOfLines={1}
          >
            {progressoTexto(q)}
          </Text>
          <Text className="ml-2 font-body text-[12px]" style={{ color: SOFT }}>
            {Math.round((q.valor / q.alvo) * 100)}%
          </Text>
        </View>
        {cta && (
          <Pressable
            onPress={() => router.push(cta.href as Href)}
            className="mt-4 h-[52px] items-center justify-center rounded-full bg-yellow active:opacity-85"
            style={shadow.yellow}
          >
            <Text className="font-body-bold text-[16px] text-night">{cta.label}</Text>
          </Pressable>
        )}
      </Pressable>
    </View>
  );
}

function Proxima({
  m,
  g,
  i,
  onOpen,
}: {
  m: MedalhaProgresso;
  g: Gamificacao;
  i: number;
  onOpen: () => void;
}) {
  const md = getMedalha(m.id)!;
  return (
    <FadeUp delay={800 + i * 100} style={{ flex: 1, minWidth: 0 }}>
      <Pressable
        onPress={onOpen}
        className="flex-row items-center gap-2.5 rounded-[20px] bg-surface px-3 py-2.5 active:opacity-90"
        style={[{ flexGrow: 1 }, shadow.card]}
      >
        <AnimatedMedal
          id={m.id}
          size={44}
          prog={m.valor / m.alvo}
          delay={900 + i * 100}
          duration={900}
        />
        <View className="min-w-0 flex-1">
          <Text className="font-body-bold text-[13px] leading-[16px] text-ink" numberOfLines={2}>
            {nomeDa(md, g.forma)}
          </Text>
          <Text className="font-body text-[11.5px] text-dim" numberOfLines={1}>
            {progressoTexto(m)}
          </Text>
        </View>
      </Pressable>
    </FadeUp>
  );
}

function Secao({ children }: { children: string }) {
  return (
    <Text className="mt-1 font-body-bold text-[12px] uppercase tracking-widest text-dim">
      {children}
    </Text>
  );
}

export default function ConquistasScreen() {
  const insets = useScreenInsets({ tabs: false });
  const { data: g, isLoading } = useGamification();
  const [aberta, setAberta] = useState<string | null>(null);
  const [caixa, setCaixa] = useState(false);
  const feitas = new Set((g?.conquistadas ?? []).map((c) => c.id));
  const quase = quaseLa(g);
  const qm = quase ? getMedalha(quase.id) : null;
  const depois = proximas(g, quase ? [quase.id] : [], 2).filter((m) => getMedalha(m.id));

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
          contentContainerClassName="gap-3.5 px-4"
          contentContainerStyle={insets}
        >
          <View>
            <Text className="font-display text-[34px] uppercase text-ink">Conquistas</Text>
            <Text className="font-body text-[15px] text-muted">
              {g
                ? `${LANCAMENTO.filter((id) => feitas.has(id)).length} de ${LANCAMENTO.length} desbloqueadas`
                : isLoading
                  ? "Carregando…"
                  : "As conquistas chegam na próxima atualização do servidor."}
            </Text>
          </View>

          {g && (
            <>
              {quase && qm && <Hero q={quase} g={g} onOpen={() => setAberta(quase.id)} />}

              {g.caixinhas > 0 && (
                <Pressable
                  onPress={() => setCaixa(true)}
                  className="flex-row items-center gap-3 rounded-3xl p-4"
                  style={[{ backgroundColor: colors.night }, shadow.lift]}
                >
                  <Text className="flex-1 font-body-bold text-[15px] text-paper">
                    {g.caixinhas > 1
                      ? `${g.caixinhas} caixinhas para abrir`
                      : "Uma caixinha para abrir"}
                  </Text>
                  <View className="rounded-full bg-yellow px-4 py-2">
                    <Text className="font-body-bold text-[13px] text-night">Abrir</Text>
                  </View>
                </Pressable>
              )}

              {depois.length > 0 && (
                <>
                  <Secao>{quase ? "Depois dela" : "As mais perto"}</Secao>
                  <View className="flex-row gap-2.5">
                    {depois.map((m, i) => (
                      <Proxima key={m.id} m={m} g={g} i={i} onOpen={() => setAberta(m.id)} />
                    ))}
                  </View>
                </>
              )}

              <Secao>Todas</Secao>
              <View className="flex-row flex-wrap" style={{ rowGap: 18 }}>
                {LANCAMENTO.map((id, i) => {
                  const m = getMedalha(id)!;
                  const p = g.medalhas.find((x) => x.id === id);
                  const c = g.conquistadas.find((x) => x.id === id);
                  const ok = !!c;
                  return (
                    <View key={id} style={{ width: "33.33%" }}>
                      <Pressable
                        onPress={() => setAberta(id)}
                        className="items-center gap-1.5 px-1 active:opacity-80"
                      >
                        <AnimatedMedal
                          id={id}
                          size={92}
                          on={ok}
                          prog={p ? p.valor / p.alvo : 0}
                          banho={c?.banho ?? null}
                          lockIcon={!ok && (!p || p.valor === 0)}
                          delay={500 + i * 70}
                          duration={1000}
                        />
                        <Text
                          className={`text-center text-[12.5px] leading-[15px] ${ok ? "font-body-bold text-ink" : "font-body-medium text-dim"}`}
                        >
                          {nomeDa(m, g.forma)}
                        </Text>
                        {!ok && p && p.alvo > 1 && (
                          <Text className="font-body text-[11px] text-dim">
                            {p.valor} de {p.alvo}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              <Text className="pb-2 text-center font-body text-[12px] text-dim">
                Só você vê as suas conquistas. Relato nunca conta para nada aqui.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
      {g && <MedalDetail id={aberta} g={g} onClose={() => setAberta(null)} />}
      <BoxModal visible={caixa} onClose={() => setCaixa(false)} />
    </>
  );
}
