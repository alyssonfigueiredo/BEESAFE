import { useEffect, useMemo } from "react";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";

import { colors, mark } from "@/theme/tokens";

// Anéis da gamificação, na geometria do símbolo da marca (caixa 100 × 100, pupila no centro).
// Com `animate`, os pedaços acesos enchem um a um, como o radar da marca (nada pula).

function arc(ro: number, ri: number, a0: number, a1: number) {
  const p = (r: number, a: number) =>
    `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(ro, a0)}A${ro} ${ro} 0 0 1 ${p(ro, a1)}L${p(ri, a1)}A${ri} ${ri} 0 0 0 ${p(ri, a0)}Z`;
}
const rad = (g: number) => (g * Math.PI) / 180;

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
/** Cor do anel da marca na posição t (0 a 1). */
export function ringColor(t: number) {
  const r = mark.ring,
    p = Math.min(0.9999, Math.max(0, t)) * r.length,
    i = Math.floor(p);
  return lerp(r[i], r[(i + 1) % r.length], p - i);
}

/** Trilho apagado: o tonal frio dos tokens (#E6ECF3, protótipo v2), não o bege antigo. */
export const OFF = colors.border;
const AP = Animated.createAnimatedComponent(Path);
/** Quanto tempo cada pedaço leva para acender (ms). */
const FILL = 260;
const fim = (n: number, step: number) => (n <= 0 ? 0 : (n - 1) * step + FILL);

/**
 * Relógio dos pedaços: `t` anda em milissegundos, linear; o pedaço i acende entre i·step e
 * i·step + FILL. Se `lit` sobe, só os pedaços novos enchem; se desce, some na hora.
 */
function useSliceClock(lit: number, animate: boolean, step: number, delay: number) {
  const reduce = useReducedMotion();
  const on = animate && !reduce;
  const t = useSharedValue(on ? 0 : fim(lit, step));
  useEffect(() => {
    const alvo = fim(lit, step);
    if (!on) {
      t.set(alvo);
      return;
    }
    const atual = t.get();
    if (alvo <= atual) {
      t.set(alvo);
      return;
    }
    t.set(
      withDelay(
        atual === 0 ? delay : 0,
        withTiming(alvo, { duration: alvo - atual, easing: Easing.linear }),
      ),
    );
  }, [lit, on, step, delay, t]);
  return { t, on };
}

function LitSlice({
  d,
  fill,
  i,
  step,
  t,
}: {
  d: string;
  fill: string;
  i: number;
  step: number;
  t: SharedValue<number>;
}) {
  const props = useAnimatedProps(() => ({
    opacity: Math.min(1, Math.max(0, (t.get() - i * step) / FILL)),
  }));
  return <AP d={d} fill={fill} animatedProps={props} />;
}

function Pupil() {
  return (
    <>
      <Circle cx={50} cy={50} r={13} fill={mark.pupil} />
      <Circle cx={46.1} cy={45.6} r={2.86} fill="#FFFFFF" />
    </>
  );
}

type Anim = {
  /** Os pedaços acesos enchem um a um ao aparecer (respeita "reduzir movimento"). */
  animate?: boolean;
  /** Espera antes do primeiro pedaço (ms). */
  delay?: number;
  /** Intervalo entre um pedaço e o seguinte (ms). */
  step?: number;
};

function Slices({
  paths,
  colors,
  lit,
  size,
  animate = false,
  delay = 200,
  step,
}: {
  paths: string[];
  colors: string[];
  lit: number;
  size: number;
  animate?: boolean;
  delay?: number;
  step: number;
}) {
  const { t, on } = useSliceClock(lit, animate, step, delay);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {paths.map((d, i) => (
        <Path key={i} d={d} fill={!on && i < lit ? colors[i] : OFF} />
      ))}
      {on &&
        paths
          .slice(0, lit)
          .map((d, i) => <LitSlice key={`l${i}`} d={d} fill={colors[i]} i={i} step={step} t={t} />)}
      <Pupil />
    </Svg>
  );
}

const WEEK_COLORS = [mark.ring[0], mark.ring[2], mark.ring[3], mark.ring[5]];
const WEEK_PATHS = WEEK_COLORS.map((_, i) =>
  arc(48, 32, rad(-90 + 90 * i + 5), rad(-90 + 90 * (i + 1) - 5)),
);

/** Semana: quatro pedaços que só acendem. Nenhum dia da semana à vista. */
export function WeekRing({
  dias,
  size = 40,
  animate,
  delay,
  step = 260,
}: { dias: number; size?: number } & Anim) {
  return (
    <Slices
      paths={WEEK_PATHS}
      colors={WEEK_COLORS}
      lit={Math.max(0, Math.min(4, dias))}
      size={size}
      animate={animate}
      delay={delay}
      step={step}
    />
  );
}

/** Anel de N tracinhos com os primeiros `lit` acesos (48 = anel da pessoa, 100 = cidade). */
export function SliceRing({
  lit,
  n = 48,
  size = 40,
  inner = 35,
  gap = 0.6,
  animate,
  delay,
  step = n > 60 ? 40 : 60,
}: {
  lit: number;
  n?: number;
  size?: number;
  inner?: number;
  gap?: number;
} & Anim) {
  const step_ = 360 / n;
  const aceso = Math.max(0, Math.min(n, lit));
  const paths = useMemo(
    () =>
      Array.from({ length: n }, (_, i) =>
        arc(48, inner, rad(-90 + step_ * i + gap / 2), rad(-90 + step_ * (i + 1) - gap / 2)),
      ),
    [n, inner, gap, step_],
  );
  const colors = useMemo(
    () => paths.map((_, i) => ringColor(n === 48 ? i / 48 : aceso > 1 ? i / (aceso - 1) : 0)),
    [paths, n, aceso],
  );
  return (
    <Slices
      paths={paths}
      colors={colors}
      lit={aceso}
      size={size}
      animate={animate}
      delay={delay}
      step={step}
    />
  );
}
