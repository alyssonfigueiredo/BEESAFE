import type { LucideIcon } from "lucide-react-native";
import type { ColorValue } from "react-native";
import { useEffect, useState } from "react";
import Animated, {
  Easing,
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { colors, mark } from "@/theme/tokens";

// Ícone da aba: ao ser selecionado sai do cinza, passa pelas seis cores da marca e pousa na
// cor da aba, com um pulinho. O ícone do Lucide não é animável por props nativas, então a cor
// vem de um estado atualizado a cada quadro durante os 750 ms — barato e só na troca de aba.
const STOPS = [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1];

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
  const [tint, setTint] = useState(focused ? active : colors.dim);

  useEffect(() => {
    if (!focused) {
      t.value = 0;
      return;
    }
    if (reduce) {
      t.value = 1;
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

  useAnimatedReaction(
    () => interpolateColor(t.value, STOPS, [colors.dim, ...mark.ring, active]),
    (c, prev) => {
      if (c !== prev) runOnJS(setTint)(c as string);
    },
    [active],
  );

  const style = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <Animated.View style={style}>
      <Icon color={focused ? tint : color} size={22} />
    </Animated.View>
  );
}
