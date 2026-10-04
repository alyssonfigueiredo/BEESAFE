import { useEffect, useMemo } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop, SvgXml } from "react-native-svg";

import { EASE, Shine, useSvgId } from "@/components/gami/Anim";
import { getMedalha, medalXml, RING, type Banho } from "@/lib/medals";

type Props = {
  id: string;
  size?: number;
  on?: boolean;
  prog?: number;
  banho?: Banho | null;
  lockIcon?: boolean;
};

/** Medalha limpa: disco, objeto e anel. Bloqueada é silhueta com o anel mostrando quanto falta. */
export function MedalView({
  id,
  size = 96,
  on = true,
  prog = 0,
  banho = null,
  lockIcon = true,
}: Props) {
  const m = getMedalha(id);
  const xml = useMemo(
    () =>
      m ? medalXml(m.art, { state: on ? "on" : "lock", prog, cat: m.cat, banho, lockIcon }) : "",
    [m, on, prog, banho, lockIcon],
  );
  if (!xml) return null;
  return <SvgXml xml={xml} width={size} height={size} />;
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
}: Props & {
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
        <MedalView id={id} size={size} on banho={banho} />
        {shine && (
          <Shine size={size} once={shine === "once"} delay={shine === "once" ? delay : 1200} />
        )}
      </View>
    );
  }

  const stops = RING.padrao;
  return (
    <View style={{ width: size, height: size }}>
      <MedalView id={id} size={size} on={false} prog={0} lockIcon={false} />
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
          <MedalView id={id} size={size} on banho={banho} />
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
