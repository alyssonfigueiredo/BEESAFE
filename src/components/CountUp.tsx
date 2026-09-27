import { useEffect, useState } from "react";
import { Text, type TextProps } from "react-native";
import {
  Easing,
  runOnJS,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/** Número que conta de zero até o valor ao aparecer (nota 4.7, 142 relatos). */
export function CountUp({
  value,
  decimals = 0,
  duration = 1000,
  ...rest
}: { value: number; decimals?: number; duration?: number } & TextProps) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? value : 0);
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    v.value = reduce ? value : withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, reduce, duration, v]);

  useAnimatedReaction(
    () => v.value,
    (n, prev) => {
      if (n !== prev) runOnJS(setShown)(n);
    },
  );

  return <Text {...rest}>{shown.toFixed(decimals)}</Text>;
}
