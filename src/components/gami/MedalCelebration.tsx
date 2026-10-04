import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { MedalView } from "@/components/gami/MedalView";
import { useGamification, useMarkSeen, useRewardOpen } from "@/hooks/useGamification";
import { getMedalha, nomeDa } from "@/lib/medals";
import { colors } from "@/theme/tokens";

const CORES = [
  colors.coral,
  colors.orange,
  colors.yellow,
  colors.turquoise,
  colors.lilac,
  "#59A7FF",
];

function Confete({ i, w }: { i: number; w: number }) {
  const t = useSharedValue(0);
  const ang = (i / 26) * Math.PI * 2 + (i % 3) * 0.3;
  const dist = 120 + ((i * 37) % 160);
  useEffect(() => {
    t.set(
      withDelay(
        250,
        withTiming(1, { duration: 1700 + (i % 5) * 120, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [t, i]);
  const st = useAnimatedStyle(() => ({
    opacity: 1 - t.value * t.value,
    transform: [
      { translateX: Math.cos(ang) * dist * t.value },
      { translateY: Math.sin(ang) * dist * t.value + 200 * t.value * t.value },
      { rotate: `${t.value * (360 + i * 40)}deg` },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: w / 2 - 4,
          top: 250,
          width: 8,
          height: 14,
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

  function fechar(irPulseira: boolean) {
    if (aberta) marcar.mutate(aberta);
    setAberta(null);
    if (irPulseira) router.push("/pulseira");
  }

  const id = aberta?.[0];
  const m = id ? getMedalha(id) : null;
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
          {!reduce && Array.from({ length: 26 }, (_, i) => <Confete key={i} i={i} w={width} />)}
          <Animated.Text
            entering={FadeIn.duration(400)}
            className="font-body-medium text-[12px] uppercase tracking-wider"
            style={{ color: colors.turquoise }}
          >
            Desbloqueada
          </Animated.Text>
          <Animated.View
            entering={reduce ? undefined : ZoomIn.springify().damping(11).delay(120)}
            style={{ marginTop: 22 }}
          >
            <MedalView id={m.id} size={228} banho={banho} />
          </Animated.View>
          <Animated.Text
            entering={reduce ? undefined : FadeInDown.duration(500).delay(450)}
            className="mt-6 text-center font-display text-[42px] uppercase leading-[46px] text-paper"
          >
            {nomeDa(m, g?.forma ?? 2)}
          </Animated.Text>
          <Animated.Text
            entering={reduce ? undefined : FadeInDown.duration(500).delay(600)}
            className="mt-3 text-center font-body text-[16px] leading-[23px]"
            style={{ color: "#C9CDE0" }}
          >
            “{m.copy}”
          </Animated.Text>
          {resto > 0 && (
            <Text className="mt-3 text-center font-body text-[13px]" style={{ color: "#8A90AA" }}>
              E mais {resto} na pulseira.
            </Text>
          )}
          <View className="absolute bottom-12 left-6 right-6 gap-2">
            <Pressable
              onPress={() => fechar(true)}
              className="items-center rounded-full bg-paper py-3.5 active:opacity-80"
            >
              <Text className="font-body-bold text-[15px] text-night">Ver a pulseira</Text>
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
