import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { colors } from "@/theme/tokens";

/** Dois segmentos com a pílula branca deslizando por baixo (trilho claro). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const reduce = useReducedMotion();
  const [width, setWidth] = useState(0);
  const idx = Math.max(
    0,
    options.findIndex((o) => o.key === value),
  );
  const pill = width > 0 ? (width - 6) / options.length : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    const to = idx * pill;
    x.set(
      reduce || !pill ? to : withTiming(to, { duration: 380, easing: Easing.out(Easing.cubic) }),
    );
  }, [idx, pill, reduce, x]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      className="flex-row rounded-[18px] p-[3px]"
      style={{ backgroundColor: colors.subtle }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {pill > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              top: 3,
              bottom: 3,
              left: 3,
              width: pill,
              borderRadius: 15,
              backgroundColor: colors.solid,
              boxShadow: "0 2px 8px rgba(20,24,41,0.12)",
            },
            pillStyle,
          ]}
        />
      )}
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            className="h-9 flex-1 items-center justify-center rounded-[15px]"
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text
              className="font-body-bold text-sm"
              style={{ color: on ? colors.ink : colors.muted }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
