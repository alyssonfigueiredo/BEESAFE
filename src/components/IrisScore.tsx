import { useEffect } from "react";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { SCALE } from "@/theme/domain";
import { colors, mark } from "@/theme/tokens";

const AP = Animated.createAnimatedComponent(Path);

/** Um gomo do anel: enche do início do seu setor até a fração do valor animado. */
function Segment({
  i,
  c,
  ro,
  ri,
  color,
  v,
}: {
  i: number;
  c: number;
  ro: number;
  ri: number;
  color: string;
  v: SharedValue<number>;
}) {
  const props = useAnimatedProps(() => {
    const fill = Math.max(0, Math.min(1, v.value - i));
    return {
      d: fill <= 0.01 ? "" : annulus(c, ro, ri, i * 72 + 0.6, i * 72 + 72 * fill),
      opacity: fill <= 0.01 ? 0 : 1,
    };
  });
  return <AP fill={color} animatedProps={props} />;
}

// A mesma escala do Rainbow curvada no anel da marca, com pupila e reflexo no centro.
// Só em tamanho grande (ficha do lugar): abaixo de ~40 px o miolo vira borrão.

function point(cx: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cx + r * Math.sin(a) };
}

function annulus(cx: number, ro: number, ri: number, a0: number, a1: number) {
  const o0 = point(cx, ro, a0),
    o1 = point(cx, ro, a1),
    i1 = point(cx, ri, a1),
    i0 = point(cx, ri, a0);
  return (
    `M ${o0.x} ${o0.y} A ${ro} ${ro} 0 0 1 ${o1.x} ${o1.y} ` +
    `L ${i1.x} ${i1.y} A ${ri} ${ri} 0 0 0 ${i0.x} ${i0.y} Z`
  );
}

export function IrisScore({ value, size = 54 }: { value: number; size?: number }) {
  const c = size / 2;
  const ro = size * 0.47;
  const ri = size * 0.315;
  const pupil = size * 0.155;
  const reduce = useReducedMotion();
  const v = useSharedValue(reduce ? value : 0);
  useEffect(() => {
    v.value = reduce
      ? value
      : withTiming(value, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [value, reduce, v]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle
        cx={c}
        cy={c}
        r={(ro + ri) / 2}
        fill="none"
        stroke={colors.border}
        strokeWidth={ro - ri}
      />
      {SCALE.map((color, i) => (
        <Segment key={color} i={i} c={c} ro={ro} ri={ri} color={color} v={v} />
      ))}
      <Circle cx={c} cy={c} r={pupil} fill={mark.pupil} />
      <Circle cx={c - pupil * 0.3} cy={c - pupil * 0.32} r={pupil * 0.22} fill={colors.surface} />
    </Svg>
  );
}
