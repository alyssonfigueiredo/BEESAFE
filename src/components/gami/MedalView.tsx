import { useEffect, useMemo } from "react";
import { Image, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, SvgXml } from "react-native-svg";

import { EASE, Shine, useSvgId } from "@/components/gami/Anim";
import { MEDALHA_IMG } from "@/lib/medalImagens";
import { getMedalha, medalXml, RING, type Banho } from "@/lib/medals";

type Props = {
  id: string;
  size?: number;
  on?: boolean;
  prog?: number;
  banho?: Banho | null;
  lockIcon?: boolean;
  /** O objeto 3D entra (aparece subindo de leve) depois deste atraso, em ms. */
  entrada?: number;
  /** O objeto 3D flutua devagar (só nos destaques: comemoração, prévia do story). */
  flutua?: boolean;
};

/** Cadeado no canto da medalha bloqueada (caixa 120 × 120). */
function Cadeado({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" style={{ position: "absolute" }}>
      <Circle cx={96} cy={96} r={13} fill="#141829" stroke="#FFFFFF" strokeWidth={3} />
      <Rect x={90.5} y={95} width={11} height={8.5} rx={2} fill="#FFFFFF" />
      <Path
        d="M92.8 95v-2.6a3.2 3.2 0 0 1 6.4 0V95"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

/**
 * O objeto 3D por cima do disco. Bloqueada: silhueta (a imagem tingida de um cinza só, o mesmo
 * da silhueta em SVG). Entra subindo de leve e, nos destaques, flutua devagar.
 */
function Objeto({
  id,
  size,
  on,
  entrada,
  flutua,
}: {
  id: string;
  size: number;
  on: boolean;
  entrada?: number;
  flutua?: boolean;
}) {
  const reduce = useReducedMotion();
  const anim = entrada != null && !reduce;
  const k = useSharedValue(anim ? 0 : 1);
  const f = useSharedValue(0);
  useEffect(() => {
    if (!anim) return;
    k.set(
      withDelay(entrada ?? 0, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })),
    );
  }, [anim, entrada, k]);
  useEffect(() => {
    if (!flutua || reduce) return;
    f.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      ),
    );
  }, [flutua, reduce, f]);
  const st = useAnimatedStyle(() => ({
    opacity: k.get(),
    transform: [
      { translateY: (1 - k.get()) * size * 0.06 - f.get() * size * 0.025 },
      { scale: 0.9 + 0.1 * k.get() },
    ],
  }));
  const lado = size * 0.7;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          left: (size - lado) / 2,
          top: (size - lado) / 2 - size * 0.01,
          width: lado,
          height: lado,
        },
        st,
      ]}
    >
      <Image
        source={MEDALHA_IMG[id]}
        style={{ width: lado, height: lado, opacity: on ? 1 : 0.9 }}
        tintColor={on ? undefined : "#C9C4BA"}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

/** Medalha limpa: disco, objeto e anel. Bloqueada é silhueta com o anel mostrando quanto falta. */
export function MedalView({
  id,
  size = 96,
  on = true,
  prog = 0,
  banho = null,
  lockIcon = true,
  entrada,
  flutua,
}: Props) {
  const m = getMedalha(id);
  const temImg = !!MEDALHA_IMG[id];
  const xml = useMemo(
    () =>
      m
        ? medalXml(m.art, {
            state: on ? "on" : "lock",
            prog,
            cat: m.cat,
            banho,
            lockIcon: temImg ? false : lockIcon,
            semArte: temImg,
          })
        : "",
    [m, on, prog, banho, lockIcon, temImg],
  );
  if (!xml) return null;
  if (!temImg) return <SvgXml xml={xml} width={size} height={size} />;
  return (
    <View style={{ width: size, height: size }}>
      <SvgXml xml={xml} width={size} height={size} />
      <Objeto id={id} size={size} on={on} entrada={entrada} flutua={flutua} />
      {!on && lockIcon && <Cadeado size={size} />}
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const L = 2 * Math.PI * 55;

/**
 * Medalha com o anel enchendo. Bloqueada: a silhueta aparece com o trilho vazio e o anel desenha
 * até o progresso. `reveal`: o anel desenha até fechar e só então a cor da medalha aparece por
 * cima (celebração, caixinha). `shine`: uma faixa de luz passa por ela de tempos em tempos;
 * `shine="once"` passa uma vez só, fraquinha, depois que o anel fecha. Nada pula nem pulsa.
 */
export function AnimatedMedal({
  id,
  size = 96,
  on = false,
  prog = 0,
  banho = null,
  lockIcon = false,
  animate = true,
  delay = 200,
  duration = 1300,
  shine = false,
  reveal = false,
  flutua = false,
}: Omit<Props, "entrada" | "flutua"> & {
  /** O objeto 3D flutua devagar depois de aparecer (destaques). */
  flutua?: boolean;
  animate?: boolean;
  delay?: number;
  duration?: number;
  shine?: boolean | "once";
  reveal?: boolean;
}) {
  const reduce = useReducedMotion();
  const gid = useSvgId("mring");
  const anim = animate && !reduce;
  const alvo = reveal ? 1 : on ? 0 : Math.max(0, Math.min(1, prog));
  const p = useSharedValue(anim ? 0 : alvo);
  const cor = useSharedValue(anim ? 0 : 1);

  useEffect(() => {
    if (!anim) {
      p.set(alvo);
      cor.set(1);
      return;
    }
    p.set(withDelay(delay, withTiming(alvo, { duration, easing: EASE })));
    if (reveal)
      cor.set(
        withDelay(
          delay + duration,
          withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }),
        ),
      );
  }, [anim, alvo, delay, duration, reveal, p, cor]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: L * (1 - p.get()),
    strokeOpacity: p.get() > 0.003 ? 1 : 0,
  }));
  const corStyle = useAnimatedStyle(() => ({ opacity: cor.get() }));

  // Desbloqueada sem revelação: a medalha pronta, sem anel para encher.
  if (on && !reveal) {
    return (
      <View style={{ width: size, height: size }}>
        <MedalView
          id={id}
          size={size}
          on
          banho={banho}
          entrada={anim ? delay : undefined}
          flutua={flutua}
        />
        {shine && (
          <Shine size={size} once={shine === "once"} delay={shine === "once" ? delay : 1200} />
        )}
      </View>
    );
  }

  const stops = RING.padrao;
  return (
    <View style={{ width: size, height: size }}>
      <MedalView
        id={id}
        size={size}
        on={false}
        prog={0}
        lockIcon={false}
        entrada={anim ? delay * 0.5 : undefined}
      />
      <Svg width={size} height={size} viewBox="0 0 120 120" style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            {stops.map((c, i) => (
              <Stop key={i} offset={i / (stops.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <AnimatedCircle
          cx={60}
          cy={60}
          r={55}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={4.5}
          strokeLinecap="round"
          strokeDasharray={[L, L]}
          transform="rotate(-90 60 60)"
          animatedProps={arcProps}
        />
        {lockIcon && !reveal && (
          <>
            <Circle cx={96} cy={96} r={13} fill="#141829" stroke="#FFFFFF" strokeWidth={3} />
            <Rect x={90.5} y={95} width={11} height={8.5} rx={2} fill="#FFFFFF" />
            <Path
              d="M92.8 95v-2.6a3.2 3.2 0 0 1 6.4 0V95"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={1.8}
            />
          </>
        )}
      </Svg>
      {reveal && (
        <Animated.View style={[{ position: "absolute" }, corStyle]}>
          <MedalView id={id} size={size} on banho={banho} flutua={flutua} />
        </Animated.View>
      )}
      {shine && (
        <Shine
          size={size}
          once={shine === "once"}
          delay={shine === "once" ? delay + duration + 520 : 1200}
        />
      )}
    </View>
  );
}
