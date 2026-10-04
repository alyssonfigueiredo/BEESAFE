import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { OFF, ringColor } from "@/components/gami/Rings";
import { colors, mark } from "@/theme/tokens";

// Peças animadas da gamificação. Princípio do Leandro: as coisas carregam e enchem (gomos um a um,
// borda que se desenha em volta do cartão, barra que enche, número que conta), nunca pulam.
// Tudo respeita "reduzir movimento": aí aparece direto no estado final.

/** A curva de preenchimento do protótipo: cubic-bezier(.3,.8,.3,1). */
export const EASE = Easing.bezier(0.3, 0.8, 0.3, 1);

/** Id seguro para gradiente do react-native-svg (ids são globais entre instâncias). */
export function useSvgId(prefix: string) {
  return prefix + useId().replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Número que conta (ou desconta, com `from` maior que `value`). É um <Text> comum, então o
 * layout acompanha a largura do número a cada passo, ao lado de " de 4" ou " para desbloquear".
 */
export function Counter({
  value,
  from = 0,
  duration = 900,
  delay = 0,
  ...rest
}: { value: number; from?: number; duration?: number; delay?: number } & TextProps) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(from);
  const atual = useRef(from);
  useEffect(() => {
    if (reduce) return;
    const de = atual.current;
    let raf = 0;
    const timer = setTimeout(() => {
      const t0 = Date.now();
      const tick = () => {
        const k = Math.min(1, (Date.now() - t0) / Math.max(1, duration));
        const v = Math.round(de + (value - de) * (1 - Math.pow(1 - k, 3)));
        atual.current = v;
        setN(v);
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay, reduce]);
  return <Text {...rest}>{reduce ? value : n}</Text>;
}

/** Entra subindo 8 px e aparecendo. */
export function FadeUp({
  delay = 0,
  duration = 420,
  distance = 8,
  style,
  children,
}: {
  delay?: number;
  duration?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) {
      p.set(1);
      return;
    }
    p.set(withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) })));
  }, [reduce, delay, duration, p]);
  const st = useAnimatedStyle(() => ({
    opacity: p.get(),
    transform: [{ translateY: (1 - p.get()) * distance }],
  }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

/** Bolinha que respira (o "QUASE LÁ"). */
export function LiveDot({ color = colors.coral, size = 7 }: { color?: string; size?: number }) {
  const reduce = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduce) return;
    o.set(
      withRepeat(
        withSequence(
          withTiming(0.25, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, [reduce, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.get() }));
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, st]}
    />
  );
}

// ---------- barra em gomos ----------
const SEG_FILL = 320;

function Seg({
  i,
  step,
  t,
  color,
}: {
  i: number;
  step: number;
  t: SharedValue<number>;
  color: string;
}) {
  const st = useAnimatedStyle(() => {
    const k = Math.min(1, Math.max(0, (t.get() - i * step) / SEG_FILL));
    return { transform: [{ scaleX: 1 - Math.pow(1 - k, 3) }] };
  });
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { backgroundColor: color, transformOrigin: "left" }, st]}
    />
  );
}

/** Barra em gomos que acendem da esquerda, um depois do outro. */
export function Segs({
  n,
  lit,
  delay = 0,
  step = 60,
  colorful = true,
  color = colors.turquoise,
  height = 7,
  gap = 3,
  track = OFF,
  style,
}: {
  n: number;
  lit: number;
  delay?: number;
  step?: number;
  colorful?: boolean;
  color?: string;
  height?: number;
  gap?: number;
  track?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReducedMotion();
  const aceso = Math.max(0, Math.min(n, Math.round(lit)));
  const fim = aceso > 0 ? (aceso - 1) * step + SEG_FILL : 0;
  const t = useSharedValue(reduce ? fim : 0);
  useEffect(() => {
    if (reduce || fim <= t.get()) {
      t.set(fim);
      return;
    }
    const atual = t.get();
    t.set(
      withDelay(
        atual === 0 ? delay : 0,
        withTiming(fim, { duration: fim - atual, easing: Easing.linear }),
      ),
    );
  }, [fim, reduce, delay, t]);
  return (
    <View style={[{ flexDirection: "row", gap }, style]}>
      {Array.from({ length: n }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: height / 2,
            backgroundColor: track,
            overflow: "hidden",
          }}
        >
          {i < aceso && (
            <Seg
              i={i}
              step={step}
              t={t}
              color={colorful ? ringColor((i / Math.max(n - 1, 1)) * 0.85) : color}
            />
          )}
        </View>
      ))}
    </View>
  );
}

// ---------- borda de progresso em volta de um cartão ----------
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * Traço arco-íris que percorre o contorno do cartão até `frac` (0 a 1), sobre um trilho claro.
 * Vai como primeiro filho de um cartão com `position: relative` (o padrão do RN); mede o próprio
 * tamanho. Começa no alto à esquerda, depois da curva, e segue no sentido do relógio.
 */
export function ProgressEdge({
  frac,
  radius = 24,
  strokeWidth = 3,
  delay = 300,
  duration = 1200,
  glow = false,
}: {
  frac: number;
  radius?: number;
  strokeWidth?: number;
  delay?: number;
  duration?: number;
  /** Cheio: brilho lilás suave em volta do cartão depois que o traço fecha. */
  glow?: boolean;
}) {
  const reduce = useReducedMotion();
  const id = useSvgId("edge");
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const alvo = Math.max(0, Math.min(1, frac));
  const p = useSharedValue(reduce ? alvo : 0);
  const g = useSharedValue(reduce && glow ? 1 : 0);
  const pronto = !!box;

  useEffect(() => {
    if (!pronto) return;
    if (reduce) {
      p.set(alvo);
      g.set(glow ? 1 : 0);
      return;
    }
    p.set(withDelay(delay, withTiming(alvo, { duration, easing: EASE })));
    g.set(glow ? withDelay(delay + duration, withTiming(1, { duration: 900 })) : withTiming(0));
  }, [pronto, alvo, glow, reduce, delay, duration, p, g]);

  const sw = strokeWidth;
  const w = (box?.w ?? 0) - sw;
  const h = (box?.h ?? 0) - sw;
  const r = Math.max(0, Math.min(radius - sw / 2, w / 2, h / 2));
  const per = Math.max(1, 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r);

  const props = useAnimatedProps(() => ({
    strokeDashoffset: per * (1 - p.get()),
    strokeOpacity: p.get() > 0.004 ? 1 : 0,
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: g.get() }));

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        if (!box || box.w !== width || box.h !== height) setBox({ w: width, h: height });
      }}
    >
      {glow && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              boxShadow: `0 0 0 0 ${colors.lilac}00, 0 12px 34px ${colors.lilac}70`,
            },
            glowStyle,
          ]}
        />
      )}
      {box && w > 0 && h > 0 && (
        <Svg width={box.w} height={box.h} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              {mark.ring.map((c, i) => (
                <Stop key={i} offset={i / (mark.ring.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect
            x={sw / 2}
            y={sw / 2}
            width={w}
            height={h}
            rx={r}
            fill="none"
            stroke={OFF}
            strokeOpacity={0.7}
            strokeWidth={sw}
          />
          <AnimatedRect
            x={sw / 2}
            y={sw / 2}
            width={w}
            height={h}
            rx={r}
            fill="none"
            stroke={`url(#${id})`}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={[per, per]}
            animatedProps={props}
          />
        </Svg>
      )}
    </View>
  );
}

// ---------- brilho que passa pela medalha ----------
/** Faixa de luz que atravessa a medalha de tempos em tempos (3,6 s), discreta. */
export function Shine({ size }: { size: number }) {
  const reduce = useReducedMotion();
  const id = useSvgId("shine");
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    t.set(
      withDelay(1200, withRepeat(withTiming(1, { duration: 3600, easing: Easing.linear }), -1)),
    );
  }, [reduce, t]);
  const inner = size * 0.88; // inset de 6 %
  const band = inner * 1.4;
  const st = useAnimatedStyle(() => {
    const k = Math.min(1, t.get() / 0.45);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    return { transform: [{ translateX: (-1.2 + 2.4 * e) * inner }] };
  });
  if (reduce) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: size * 0.06,
        top: size * 0.06,
        width: inner,
        height: inner,
        borderRadius: inner / 2,
        overflow: "hidden",
      }}
    >
      <Animated.View style={[{ position: "absolute", left: -inner * 0.2, top: -inner * 0.2 }, st]}>
        <Svg width={band} height={band}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0.3" x2="1" y2="0.7">
              <Stop offset="0.38" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.7} />
              <Stop offset="0.62" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={band} height={band} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}
