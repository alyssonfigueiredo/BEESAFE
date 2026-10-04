import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { FadeUp } from "@/components/gami/Anim";
import { AnimatedMedal } from "@/components/gami/MedalView";
import { useGamification, useMarkSeen, useRewardOpen } from "@/hooks/useGamification";
import { getMedalha, nomeDa } from "@/lib/medals";
import { colors } from "@/theme/tokens";
import { useFolhaAberta } from "@/hooks/useDiscovery";

const CORES = [
  colors.coral,
  colors.orange,
  colors.yellow,
  colors.turquoise,
  colors.lilac,
  "#59A7FF",
];

// Confete discreto: poucos papeizinhos, pequenos, que só saem quando o anel da medalha fecha.
const CONFETES = 14;
const ANEL = 1300; // o anel desenha em 1,3 s (AnimatedMedal), depois a cor aparece

function Confete({ i, w }: { i: number; w: number }) {
  const t = useSharedValue(0);
  const ang = (i / CONFETES) * Math.PI * 2 + (i % 3) * 0.3;
  const dist = 90 + ((i * 37) % 90);
  useEffect(() => {
    t.set(
      withDelay(
        200 + ANEL,
        withTiming(1, { duration: 1500 + (i % 5) * 120, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [t, i]);
  const st = useAnimatedStyle(() => ({
    opacity: t.get() === 0 ? 0 : 0.8 * (1 - t.get() * t.get()),
    transform: [
      { translateX: Math.cos(ang) * dist * t.get() },
      { translateY: Math.sin(ang) * dist * t.get() + 120 * t.get() * t.get() },
      { rotate: `${t.get() * (300 + i * 30)}deg` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: w / 2 - 3,
          top: 250,
          width: 6,
          height: 10,
          borderRadius: 2,
          backgroundColor: CORES[i % CORES.length],
        },
        st,
      ]}
    />
  );
}

/**
 * Medalha nova, em tela cheia. Fica no layout raiz e aparece sozinha quando o banco desbloqueia
 * alguma medalha que a pessoa ainda não viu; espera a folha da avaliação fechar.
 */
export function MedalCelebration() {
  const { data: g } = useGamification();
  const rewardOpen = useRewardOpen();
  const marcar = useMarkSeen();
  const reduce = useReducedMotion();
  const { width } = useWindowDimensions();
  const [aberta, setAberta] = useState<string[] | null>(null);

  const novas = useMemo(
    () => (g?.conquistadas ?? []).filter((c) => !c.visto && getMedalha(c.id)).map((c) => c.id),
    [g],
  );

  useEffect(() => {
    if (aberta || rewardOpen || novas.length === 0) return;
    const t = setTimeout(() => setAberta(novas), 600);
    return () => clearTimeout(t);
  }, [novas, aberta, rewardOpen]);

  function fechar(irConquistas: boolean) {
    if (aberta) marcar.mutate(aberta);
    setAberta(null);
    if (irConquistas) router.push("/conquistas");
  }

  const id = aberta?.[0];
  const m = id ? getMedalha(id) : null;
  useFolhaAberta(!!m);
  const banho = g?.conquistadas.find((c) => c.id === id)?.banho ?? null;
  const resto = (aberta?.length ?? 1) - 1;

  return (
    <Modal
      visible={!!m}
      transparent
      animationType="fade"
      onRequestClose={() => fechar(false)}
      statusBarTranslucent
    >
      {m && (
        <View className="flex-1 items-center px-7 pt-24" style={{ backgroundColor: colors.night }}>
          {!reduce &&
            Array.from({ length: CONFETES }, (_, i) => (
              <Confete key={`${m.id}-${i}`} i={i} w={width} />
            ))}
          <FadeUp duration={400}>
            <Text
              className="font-body-medium text-[12px] uppercase tracking-wider"
              style={{ color: colors.turquoise }}
            >
              Desbloqueada
            </Text>
          </FadeUp>
          <View style={{ marginTop: 22 }}>
            <AnimatedMedal
              key={m.id}
              id={m.id}
              size={228}
              banho={banho}
              reveal
              delay={200}
              duration={ANEL}
            />
          </View>
          <FadeUp key={`n-${m.id}`} delay={reduce ? 0 : 600} duration={500}>
            <Text className="mt-6 text-center font-display text-[42px] uppercase leading-[46px] text-paper">
              {nomeDa(m, g?.forma ?? 2)}
            </Text>
          </FadeUp>
          <FadeUp key={`c-${m.id}`} delay={reduce ? 0 : 800} duration={500}>
            <Text
              className="mt-3 text-center font-body text-[16px] leading-[23px]"
              style={{ color: "#C9CDE0" }}
            >
              “{m.copy}”
            </Text>
          </FadeUp>
          {resto > 0 && (
            <Text className="mt-3 text-center font-body text-[13px]" style={{ color: "#8A90AA" }}>
              E mais {resto} nas suas conquistas.
            </Text>
          )}
          <View className="absolute bottom-12 left-6 right-6 gap-2">
            <Pressable
              onPress={() => fechar(true)}
              className="items-center rounded-full bg-paper py-3.5 active:opacity-80"
            >
              <Text className="font-body-bold text-[15px] text-night">Ver conquistas</Text>
            </Pressable>
            <Pressable
              onPress={() => fechar(false)}
              className="items-center py-3 active:opacity-70"
            >
              <Text className="font-body-bold text-[15px] text-paper">Fechar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Modal>
  );
}
