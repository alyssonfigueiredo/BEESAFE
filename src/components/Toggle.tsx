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
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      className="h-7 w-[46px] rounded-full"
      style={{ backgroundColor: value ? colors.turquoise : colors.border }}
    >
      <Animated.View
        style={[
          {
            position: "absolute",
            top: 3,
            left: 3,
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
