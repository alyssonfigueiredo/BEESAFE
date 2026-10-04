import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { colors } from "@/theme/tokens";

// Uma explosão de confete, uma vez só, a partir de um ponto (a prévia do cartão de story).
// Pedido do Leandro para essa tela, que é a hora de celebrar e postar. Nada fica em loop:
// os pedaços sobem, caem com gravidade, giram e somem em ~1,8 s. Com "reduzir movimento", nada aparece.

const CORES = [
  colors.coral,
  colors.orange,
  colors.yellow,
  colors.turquoise,
  "#59A7FF",
  colors.lilac,
];
const N = 56;
const DUR = 1800;

type Peca = {
  vx: number;
  vy: number;
  giro: number;
  w: number;
  h: number;
  cor: string;
  redondo: boolean;
  atraso: number;
};

function Pedaco({ p, t, x0, y0 }: { p: Peca; t: SharedValue<number>; x0: number; y0: number }) {
  const st = useAnimatedStyle(() => {
    const k = t.get();
    // Desacelera no ar (atrito) e a gravidade puxa para baixo.
    const s = 1 - Math.pow(1 - k, 2.2);
    const x = x0 + p.vx * s;
    const y = y0 + p.vy * s + 520 * k * k;
    return {
      opacity: k <= 0 ? 0 : k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${p.giro * k}deg` },
        { scaleX: p.redondo ? 1 : 0.4 + 0.6 * Math.abs(Math.cos(k * p.giro * 0.05)) },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          left: 0,
          top: 0,
          width: p.w,
          height: p.h,
          borderRadius: p.redondo ? p.w / 2 : 1.5,
          backgroundColor: p.cor,
        },
        st,
      ]}
    />
  );
}

function PedacoAnimado({ p, x0, y0 }: { p: Peca; x0: number; y0: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(p.atraso, withTiming(1, { duration: DUR, easing: Easing.linear })));
  }, [t, p.atraso]);
  return <Pedaco p={p} t={t} x0={x0} y0={y0} />;
}

/** Explode uma vez quando monta. Troque a `key` para explodir de novo. */
// Pseudoaleatório com semente fixa: o desenho da explosão é calculado uma vez, fora do render.
function rnd(seed: number) {
  const v = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return v - Math.floor(v);
}
const PECAS: Peca[] = Array.from({ length: N }, (_, i) => {
  // Leque para cima, mais forte no centro, um pouco para os lados.
  const ang = (-90 + (rnd(i + 1) - 0.5) * 150) * (Math.PI / 180);
  const forca = 170 + rnd(i + 101) * 230;
  const redondo = i % 5 === 0;
  return {
    vx: Math.cos(ang) * forca,
    vy: Math.sin(ang) * forca,
    giro: (rnd(i + 201) < 0.5 ? -1 : 1) * (240 + rnd(i + 301) * 480),
    w: redondo ? 7 : 6 + rnd(i + 401) * 4,
    h: redondo ? 7 : 10 + rnd(i + 501) * 6,
    cor: CORES[i % CORES.length],
    redondo,
    atraso: rnd(i + 601) * 120,
  };
});

export function Confete({ x, y }: { x: number; y: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PECAS.map((p, i) => (
        <PedacoAnimado key={i} p={p} x0={x} y0={y} />
      ))}
    </View>
  );
}
