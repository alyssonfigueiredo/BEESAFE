import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

import { colors } from "@/theme/tokens";

/** Interruptor liso, usado onde quer que a pessoa escolha algo binário (ex.: publicar anônimo). */
export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    p.set(reduce ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: 250 }));
  }, [value, reduce, p]);
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.get() * 18 }] }));
  // Bolinha no FLUXO (padding centraliza), nunca position:absolute: no aparelho a absoluta saía
  // deslocada pra fora do trilho (13/10/2026). Estilo direto, sem className, pra não depender da
  // ordem de resolução do nativewind no Pressable.
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      style={{
        width: 46,
        height: 28,
        borderRadius: 14,
        padding: 3,
        justifyContent: "center",
        backgroundColor: value ? colors.turquoise : colors.border,
      }}
    >
      <Animated.View
        style={[
          {
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: "#FFFFFF",
            boxShadow: "0 1px 3px rgba(20,24,41,0.2)",
          },
          knob,
        ]}
      />
    </Pressable>
  );
}
