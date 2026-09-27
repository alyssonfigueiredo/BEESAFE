import type { LucideIcon } from "lucide-react-native";
import { useEffect } from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { mark } from "@/theme/tokens";

// Ícone da aba: ao ser selecionado sai do cinza, passa pelas seis cores da marca e pousa na
// cor da aba, com um pulinho. São sete cópias do ícone empilhadas (cinza, seis cores e a cor
// final) e só a opacidade anima — tudo na thread de animação, sem ponte para o React.
const STEP = 0.14;

function Layer({
  icon: Icon,
  color,
  at,
  t,
  last,
}: {
  icon: LucideIcon;
  color: string;
  at: number;
  t: SharedValue<number>;
  last?: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const d = t.value - at;
    // cada cor acende num triângulo em volta do seu ponto; a última fica acesa depois dele
    const o = last
      ? Math.max(0, Math.min(1, (d + STEP) / STEP))
      : Math.max(0, 1 - Math.abs(d) / STEP);
    return { opacity: o };
  });
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <Icon color={color} size={22} />
    </Animated.View>
  );
}

export function TabIcon({
  icon: Icon,
  color,
  focused,
  active,
}: {
  icon: LucideIcon;
  color: ColorValue;
  focused: boolean;
  /** Cor em que o ícone pousa quando a aba está ativa. */
  active: string;
}) {
  const reduce = useReducedMotion();
  const t = useSharedValue(focused ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (!focused || reduce) {
      t.value = focused ? 1 : 0;
      return;
    }
    t.value = 0;
    t.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) });
    pop.value = withSequence(
      withTiming(0.8, { duration: 80 }),
      withTiming(1.12, { duration: 260, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 200 }),
    );
  }, [focused, reduce, t, pop]);

  const wrap = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  if (!focused) return <Icon color={color} size={22} />;

  return (
    <Animated.View style={[{ width: 22, height: 22 }, wrap]}>
      <View style={StyleSheet.absoluteFill}>
        <Icon color={String(color)} size={22} />
      </View>
      {mark.ring.map((c, i) => (
        <Layer key={c} icon={Icon} color={c} at={(i + 1) * STEP} t={t} />
      ))}
      <Layer icon={Icon} color={active} at={1} t={t} last />
    </Animated.View>
  );
}
