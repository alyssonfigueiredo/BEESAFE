import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Path } from "react-native-svg";

import { Aurora } from "@/components/Aurora";
import { colors, fonts, mark } from "@/theme/tokens";

// Abertura do app: o radar pinta o anel. O anel nasce cinza, a varredura dá uma volta e acende
// cada gomo ao passar; a pupila abre, o nome entra fechando o espaçamento, uma barra arco-íris
// marca o progresso. Depois o splash sobe e some. Com "reduzir movimento", dura 0,3 s.

const AP = Animated.createAnimatedComponent(Path);
const AG = Animated.createAnimatedComponent(G);
const AC = Animated.createAnimatedComponent(Circle);

const SLICES = 48;
const SWEEP_START = (-150 * Math.PI) / 180;
const SWEEP_END = (-55 * Math.PI) / 180;
const DURATION = 2700;

function point(r: number, a: number) {
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}
function slicePath(ro: number, ri: number, a0: number, a1: number) {
  const o0 = point(ro, a0),
    o1 = point(ro, a1),
    i1 = point(ri, a1),
    i0 = point(ri, a0);
  return (
    `M ${o0.x} ${o0.y} A ${ro} ${ro} 0 0 1 ${o1.x} ${o1.y} ` +
    `L ${i1.x} ${i1.y} A ${ri} ${ri} 0 0 0 ${i0.x} ${i0.y} Z`
  );
}
function lerp(a: string, b: string, t: number) {
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const x = parseInt(a.slice(i, i + 2), 16),
      y = parseInt(b.slice(i, i + 2), 16);
    out += Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}
function ringColor(t: number) {
  const p = t * mark.ring.length;
  const i = Math.floor(p) % mark.ring.length;
  return lerp(mark.ring[i], mark.ring[(i + 1) % mark.ring.length], p - Math.floor(p));
}

const slices = Array.from({ length: SLICES }, (_, i) => ({
  d: slicePath(
    48,
    35,
    (i / SLICES) * 2 * Math.PI - Math.PI / 2,
    ((i + 1) / SLICES) * 2 * Math.PI - Math.PI / 2 + 0.05,
  ),
  fill: ringColor(i / SLICES),
  // ângulo em que a varredura (que parte de -55°) alcança este gomo
  theta: (((i * 360) / SLICES - 35) % 360) + (i * 360 < 35 * SLICES ? 360 : 0),
}));
const sweepEnd = point(33, SWEEP_END);

function Slice({
  d,
  fill,
  theta,
  sweep,
}: {
  d: string;
  fill: string;
  theta: number;
  sweep: SharedValue<number>;
}) {
  const props = useAnimatedProps(() => ({ opacity: sweep.value >= theta ? 1 : 0 }));
  return <AP d={d} fill={fill} animatedProps={props} />;
}

export function Splash({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const sweep = useSharedValue(0); // graus percorridos pela varredura
  const pupil = useSharedValue(0);
  const word = useSharedValue(0);
  const bar = useSharedValue(0);
  const lift = useSharedValue(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (reduce) {
      sweep.value = 360;
      pupil.value = 1;
      word.value = 1;
      bar.value = 1;
      lift.value = withDelay(
        300,
        withTiming(1, { duration: 200 }, () => runOnJS(setGone)(true)),
      );
      return;
    }
    sweep.value = withSequence(
      withDelay(150, withTiming(360, { duration: 1600, easing: Easing.bezier(0.3, 0.1, 0.3, 1) })),
      withRepeat(withTiming(720, { duration: 7000, easing: Easing.linear }), -1, false),
    );
    pupil.value = withDelay(
      1550,
      withTiming(1, { duration: 550, easing: Easing.bezier(0.2, 0.9, 0.3, 1.3) }),
    );
    word.value = withDelay(
      1750,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
    );
    bar.value = withTiming(1, { duration: 2500, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    lift.value = withDelay(
      DURATION,
      withTiming(1, { duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1) }, () =>
        runOnJS(setGone)(true),
      ),
    );
  }, [reduce, sweep, pupil, word, bar, lift]);

  useEffect(() => {
    if (gone) onDone();
  }, [gone, onDone]);

  const sweepProps = useAnimatedProps(() => ({
    rotation: sweep.value % 360,
    origin: "50, 50" as const,
  }));
  const pupilProps = useAnimatedProps(() => ({ r: 13 * pupil.value }));
  const shineProps = useAnimatedProps(() => ({ r: 2.86 * pupil.value }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    letterSpacing: 26 * (0.6 - 0.26 * word.value),
    transform: [{ translateY: 6 * (1 - word.value) }],
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, (word.value - 0.6) / 0.4) }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - lift.value,
    transform: [{ scale: 1 + 0.04 * lift.value }],
  }));

  if (gone) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} pointerEvents="none">
      <Aurora />
      <Svg width={132} height={132} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={41.5} fill="none" stroke="#D9D6CF" strokeWidth={13} />
        {slices.map((s) => (
          <Slice key={s.d} d={s.d} fill={s.fill} theta={s.theta} sweep={sweep} />
        ))}
        <AG animatedProps={sweepProps}>
          <Path d={slicePath(33, 0, SWEEP_START, SWEEP_END)} fill={mark.sweep} fillOpacity={0.28} />
          <Path
            d={`M 50 50 L ${sweepEnd.x} ${sweepEnd.y}`}
            stroke={mark.sweep}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeOpacity={0.8}
          />
        </AG>
        <Circle
          cx={50}
          cy={50}
          r={25}
          fill="none"
          stroke={mark.sweep}
          strokeWidth={0.8}
          strokeOpacity={0.35}
        />
        <Circle cx={66} cy={36} r={3.1} fill={mark.sweep} />
        <Circle cx={63} cy={62} r={2.4} fill={colors.coral} />
        <Circle cx={38} cy={34} r={1.9} fill={mark.sweep} />
        <AC cx={50} cy={50} fill={mark.pupil} animatedProps={pupilProps} />
        <AC cx={46.1} cy={45.6} fill="#FFFFFF" animatedProps={shineProps} />
      </Svg>
      <Animated.Text style={[styles.word, wordStyle]}>
        IRIS
        <Text style={{ color: colors.yellow }}>A</Text>
      </Animated.Text>
      <Animated.Text style={[styles.tag, tagStyle]}>quanta cor tem aqui?</Animated.Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, barStyle]}>
          {mark.ring.map((c) => (
            <View key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", gap: 22, zIndex: 100 },
  word: { fontFamily: fonts.wordmark, fontSize: 26, color: colors.ink, paddingLeft: 9 },
  tag: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  track: {
    position: "absolute",
    bottom: 96,
    width: 120,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.subtle,
    overflow: "hidden",
  },
  fill: { height: "100%", flexDirection: "row", borderRadius: 2, overflow: "hidden" },
});
