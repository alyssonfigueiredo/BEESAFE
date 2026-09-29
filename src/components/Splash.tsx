import { useEffect, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  type SharedValue,
  interpolateColor,
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
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { Aurora } from "@/components/Aurora";
import { colors, fonts, mark } from "@/theme/tokens";

// Abertura do app (versão 2 de docs/abertura.html): o radar pinta o anel. O anel nasce cinza, a
// varredura dá uma volta e acende cada gomo ao passar; a pupila abre e o nome entra. Depois a
// varredura sai do anel e pinta a tela inteira, gomo a gomo, até a borda; o olho ganha uma borda
// branca de 5 px e o nome fica branco. As cores saem pela mesma varredura, a marca volta ao
// normal e o splash some, revelando o app. Com "reduzir movimento", dura 0,3 s.

const AP = Animated.createAnimatedComponent(Path);
const AC = Animated.createAnimatedComponent(Circle);

const SLICES = 48;
const SWEEP_START = (-150 * Math.PI) / 180;
const SWEEP_END = (-55 * Math.PI) / 180;
// Linha do tempo (ms), a mesma do vídeo.
const FLOOD = 3000; // a varredura grande começa a pintar a tela
const SWEEP = 1600; // uma volta da varredura grande
const SAIDA = 5500; // as cores começam a sair
const END = 7250; // o splash some
const BIG = 64; // gomos da tela
const LOGO = 132;
const RING_R = (48 / 100) * LOGO; // raio externo do anel, em px
const DISC = 2 * (RING_R + 5); // disco atrás do olho: anel + 5 px de borda

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

/**
 * Revela `children` (parado) num setor que cresce no sentido horário a partir do topo, de 0 a
 * `progress` × 360°. Só transform de View: duas metades recortadas, cada uma com uma janela que gira
 * e o conteúdo girando ao contrário dentro dela, para ficar no lugar. Nada de SVG animado, nada de
 * transparência parcial: a borda é dura e acompanha a linha da varredura.
 */
function PieReveal({
  R,
  progress,
  children,
}: {
  R: number;
  progress: SharedValue<number>;
  children: ReactNode;
}) {
  const D = 2 * R;
  const w1 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.min(180, Math.max(0, progress.value * 360))}deg` }],
  }));
  const c1 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-Math.min(180, Math.max(0, progress.value * 360))}deg` }],
  }));
  const w2 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.min(180, Math.max(0, progress.value * 360 - 180))}deg` }],
  }));
  const c2 = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-Math.min(180, Math.max(0, progress.value * 360 - 180))}deg` }],
  }));
  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", left: 0, top: 0, width: D, height: D }}
    >
      {/* metade direita: 0° a 180° */}
      <View
        style={{ position: "absolute", left: R, top: 0, width: R, height: D, overflow: "hidden" }}
      >
        <Animated.View
          style={[
            { position: "absolute", left: -R, top: 0, width: R, height: D, overflow: "hidden" },
            { transformOrigin: "right center" },
            w1,
          ]}
        >
          <Animated.View
            style={[{ position: "absolute", left: 0, top: 0, width: D, height: D }, c1]}
          >
            {children}
          </Animated.View>
        </Animated.View>
      </View>
      {/* metade esquerda: 180° a 360° */}
      <View
        style={{ position: "absolute", left: 0, top: 0, width: R, height: D, overflow: "hidden" }}
      >
        <Animated.View
          style={[
            { position: "absolute", left: R, top: 0, width: R, height: D, overflow: "hidden" },
            { transformOrigin: "left center" },
            w2,
          ]}
        >
          <Animated.View
            style={[{ position: "absolute", left: -R, top: 0, width: D, height: D }, c2]}
          >
            {children}
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

export function Splash({ onDone }: { onDone: () => void }) {
  const reduce = useReducedMotion();
  const sweep = useSharedValue(0); // giro do radar (repete para sempre)
  const paint = useSharedValue(0); // gomos acesos no anel (para em 360: depois disso, nada anima)
  const pupil = useSharedValue(0);
  const word = useSharedValue(0);
  const bar = useSharedValue(0);
  const lift = useSharedValue(0);
  const fin = useSharedValue(0); // 0→1: a varredura grande pinta a tela
  const fout = useSharedValue(0); // 0→1: a varredura grande apaga a tela
  const border = useSharedValue(0); // 0→1: borda branca do olho
  const white = useSharedValue(0); // 0→1: nome em branco
  const extra = useSharedValue(1); // frase e barra: somem quando a tela ganha cor
  const [gone, setGone] = useState(false);
  const win = useWindowDimensions();
  // centro do olho na tela, medido no layout: a varredura grande nasce dali
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (reduce) {
      sweep.value = 360;
      paint.value = 360;
      pupil.value = 1;
      word.value = 1;
      bar.value = 1;
      lift.value = withDelay(
        300,
        withTiming(1, { duration: 200 }, () => runOnJS(setGone)(true)),
      );
      return;
    }
    paint.value = withDelay(
      150,
      withTiming(360, { duration: 1600, easing: Easing.bezier(0.3, 0.1, 0.3, 1) }),
    );
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
    const lin = { duration: SWEEP, easing: Easing.linear };
    fin.value = withDelay(FLOOD, withTiming(1, lin));
    fout.value = withDelay(SAIDA, withTiming(1, lin));
    const soft = { duration: 1100, easing: Easing.bezier(0.4, 0, 0.2, 1) };
    border.value = withSequence(
      withDelay(FLOOD + 200, withTiming(1, soft)),
      withDelay(SAIDA + 600 - (FLOOD + 200 + 1100), withTiming(0, soft)),
    );
    white.value = withSequence(
      withDelay(FLOOD + 450, withTiming(1, { duration: 500 })),
      withDelay(SAIDA + 1100 - (FLOOD + 450 + 500), withTiming(0, { duration: 500 })),
    );
    extra.value = withDelay(FLOOD, withTiming(0, { duration: 300 }));
    lift.value = withDelay(
      END,
      withTiming(1, { duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1) }, () =>
        runOnJS(setGone)(true),
      ),
    );
  }, [reduce, sweep, paint, pupil, word, bar, lift, fin, fout, border, white, extra]);

  useEffect(() => {
    if (gone) onDone();
  }, [gone, onDone]);

  // Giro da varredura: por estilo de View, em volta do centro dela. `rotation`/`origin` de um G do
  // react-native-svg viram matriz no JS e não chegam ao nativo quando o Reanimated anima direto.
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sweep.value % 360}deg` }],
  }));
  const pupilProps = useAnimatedProps(() => ({ r: 13 * pupil.value }));
  const shineProps = useAnimatedProps(() => ({ r: 2.86 * pupil.value }));
  // opacidade e subida na linha; o espaçamento que fecha, em cada parte do nome
  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: 6 * (1 - word.value) }],
  }));
  const spacing = useAnimatedStyle(() => ({ letterSpacing: 26 * (0.6 - 0.26 * word.value) }));
  const tagStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, (word.value - 0.6) / 0.4) * extra.value,
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const trackStyle = useAnimatedStyle(() => ({ opacity: extra.value }));
  const irisStyle = useAnimatedStyle(() => ({
    color: interpolateColor(white.value, [0, 1], [colors.ink, "#FFFFFF"]),
  }));
  const aStyle = useAnimatedStyle(() => ({
    color: interpolateColor(white.value, [0, 1], [colors.yellow, "#FFFFFF"]),
  }));
  // Disco atrás do olho desde o início (a cor não aparece por dentro do anel); cresce 5 px além
  // do anel e passa do papel para o branco quando a tela ganha cor.
  const discStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(border.value, [0, 1], [colors.paper, "#FFFFFF"]),
    transform: [{ scale: (2 * RING_R) / DISC + (1 - (2 * RING_R) / DISC) * border.value }],
  }));
  // a sombra cresce junto com o disco e só aparece com ele
  const discShadow = useAnimatedStyle(() => ({
    opacity: border.value,
    transform: [{ scale: (2 * RING_R) / DISC + (1 - (2 * RING_R) / DISC) * border.value }],
  }));
  const bigLine = useAnimatedStyle(() => {
    const saindo = fout.value > 0;
    const t = saindo ? fout.value : fin.value;
    return {
      opacity: t > 0 && t < 1 ? 1 : 0,
      transform: [{ rotate: `${t * 360}deg` }],
    };
  });

  // Gomos da tela: do centro do olho até além do canto mais distante.
  const big = useMemo(() => {
    if (!center) return null;
    const { x: cx, y: cy } = center;
    const R = Math.hypot(Math.max(cx, win.width - cx), Math.max(cy, win.height - cy)) + 12;
    const at = (r: number, a: number) => [R + r * Math.cos(a), R + r * Math.sin(a)];
    const sectors = Array.from({ length: BIG }, (_, i) => {
      const a0 = (i / BIG) * 2 * Math.PI - Math.PI / 2;
      const a1 = ((i + 1) / BIG) * 2 * Math.PI - Math.PI / 2 + 0.03;
      const [x0, y0] = at(R, a0);
      const [x1, y1] = at(R, a1);
      return {
        d: `M ${R} ${R} L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`,
        fill: ringColor(i / BIG),
      };
    });
    // Linha e cunha numa caixa 2R × 2R com o centro do olho no meio: a caixa gira em volta dela mesma.
    const rel = (r: number, a: number) => [R + r * Math.cos(a), R + r * Math.sin(a)];
    const b0 = (-130 * Math.PI) / 180;
    const b1 = -Math.PI / 2;
    const [wx, wy] = rel(R, b0);
    const [ex, ey] = rel(R, b1);
    const [gx, gy] = rel(R * 0.8, b0);
    return {
      cx,
      cy,
      R,
      sectors,
      wedge: `M ${R} ${R} L ${wx} ${wy} A ${R} ${R} 0 0 1 ${ex} ${ey} Z`,
      line: `M ${R} ${R} L ${ex} ${ey}`,
      grad: { x1: gx, y1: gy, x2: ex, y2: ey },
    };
  }, [center, win.width, win.height]);
  const rootStyle = useAnimatedStyle(() => ({
    opacity: 1 - lift.value,
    transform: [{ scale: 1 + 0.04 * lift.value }],
  }));

  if (gone) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} pointerEvents="none">
      <Aurora />
      {big && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: big.cx - big.R,
            top: big.cy - big.R,
            width: 2 * big.R,
            height: 2 * big.R,
          }}
        >
          <PieReveal R={big.R} progress={fin}>
            <Svg width={2 * big.R} height={2 * big.R}>
              {big.sectors.map((g) => (
                <Path key={g.d} d={g.d} fill={g.fill} />
              ))}
            </Svg>
          </PieReveal>
          <PieReveal R={big.R} progress={fout}>
            {/* o fundo da tela, no mesmo lugar em que está atrás */}
            <View
              style={{
                position: "absolute",
                left: big.R - big.cx,
                top: big.R - big.cy,
                width: win.width,
                height: win.height,
              }}
            >
              <Aurora />
            </View>
          </PieReveal>
        </View>
      )}
      {big && (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: big.cx - big.R,
              top: big.cy - big.R,
              width: 2 * big.R,
              height: 2 * big.R,
            },
            bigLine,
          ]}
        >
          <Svg width={2 * big.R} height={2 * big.R}>
            <Defs>
              <LinearGradient id="bigsw" gradientUnits="userSpaceOnUse" {...big.grad}>
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
                <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.35} />
              </LinearGradient>
            </Defs>
            <Path d={big.wedge} fill="url(#bigsw)" />
            <Path
              d={big.line}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeOpacity={0.85}
            />
          </Svg>
        </Animated.View>
      )}
      <View
        style={styles.logo}
        onLayout={(e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          setCenter({ x: x + width / 2, y: y + height / 2 });
        }}
      >
        <Animated.View style={[styles.disc, styles.discShadow, discShadow]} />
        <Animated.View style={[styles.disc, discStyle]} />
        <Svg width={LOGO} height={LOGO} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={41.5} fill="none" stroke="#D9D6CF" strokeWidth={13} />
          {slices.map((s) => (
            <Slice key={s.d} d={s.d} fill={s.fill} theta={s.theta} sweep={paint} />
          ))}
        </Svg>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, sweepStyle]}>
          <Svg width={LOGO} height={LOGO} viewBox="0 0 100 100">
            <Path
              d={slicePath(33, 0, SWEEP_START, SWEEP_END)}
              fill={mark.sweep}
              fillOpacity={0.28}
            />
            <Path
              d={`M 50 50 L ${sweepEnd.x} ${sweepEnd.y}`}
              stroke={mark.sweep}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeOpacity={0.8}
            />
          </Svg>
        </Animated.View>
        <Svg width={LOGO} height={LOGO} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
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
      </View>
      {/* Duas partes para o A amarelo poder ficar branco junto com o resto na versão negativa. */}
      <Animated.View style={[styles.wordRow, wordStyle]}>
        <Animated.Text style={[styles.word, spacing, irisStyle]}>IRIS</Animated.Text>
        <Animated.Text style={[styles.word, spacing, aStyle]}>A</Animated.Text>
      </Animated.View>
      <Animated.Text style={[styles.tag, tagStyle]}>quanta cor tem aqui?</Animated.Text>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.fill, barStyle]}>
          {mark.ring.map((c) => (
            <View key={c} style={{ flex: 1, backgroundColor: c }} />
          ))}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", justifyContent: "center", gap: 22, zIndex: 100 },
  logo: { width: LOGO, height: LOGO, alignItems: "center", justifyContent: "center" },
  disc: {
    position: "absolute",
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    left: (LOGO - DISC) / 2,
    top: (LOGO - DISC) / 2,
  },
  discShadow: { backgroundColor: "#FFFFFF", boxShadow: "0 6px 22px rgba(20,24,41,0.10)" },
  wordRow: { flexDirection: "row", paddingLeft: 9 },
  word: { fontFamily: fonts.wordmark, fontSize: 26, color: colors.ink },
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
