import { useEffect } from "react";
import { TextInput, type TextInputProps } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

// Número que conta de zero até o valor ao aparecer (nota 4.7, 142 relatos). O texto é
// escrito direto na thread de animação (TextInput não editável), sem passar pelo React.
const AnimatedInput = Animated.createAnimatedComponent(TextInput);

export function CountUp({
  value,
  decimals = 0,
  duration = 1000,
  ...rest
}: { value: number; decimals?: number; duration?: number } & Omit<
  TextInputProps,
  "value" | "defaultValue"
>) {
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? value : 0);

  useEffect(() => {
    v.value = reduce ? value : withTiming(value, { duration, easing: Easing.out(Easing.cubic) });
  }, [value, reduce, duration, v]);

  const props = useAnimatedProps(() => {
    const text = v.value.toFixed(decimals);
    return { text, defaultValue: text } as { text: string; defaultValue: string };
  });

  return (
    <AnimatedInput
      editable={false}
      underlineColorAndroid="transparent"
      defaultValue={(reduce ? value : 0).toFixed(decimals)}
      animatedProps={props}
      {...rest}
      style={[{ padding: 0, margin: 0 }, rest.style]}
    />
  );
}
