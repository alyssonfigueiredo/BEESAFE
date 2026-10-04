import { useEffect, useMemo, type ReactNode } from "react";
import { Image } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";

import { NIVEL_IMG } from "@/lib/medalImagens";
import { iconeXml } from "@/lib/niveis";

type Props = {
  k: number;
  size?: number;
  /** Entra subindo de leve depois deste atraso, em ms. */
  entrada?: number;
  /** Flutua devagar (destaques: subiu de nível, prévia do story). */
  flutua?: boolean;
};

/** Mesmo movimento do objeto das medalhas (MedalView): entra subindo e, se pedir, flutua. */
function Movimento({
  size,
  entrada,
  flutua,
  children,
}: Omit<Props, "k"> & { children: ReactNode }) {
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
  const s = size ?? 36;
  const st = useAnimatedStyle(() => ({
    opacity: k.get(),
    transform: [
      { translateY: (1 - k.get()) * s * 0.08 - f.get() * s * 0.04 },
      { scale: 0.88 + 0.12 * k.get() },
    ],
  }));
  return <Animated.View style={st}>{children}</Animated.View>;
}

/** Ícone do nível de "Sua evolução" (0 a 7): imagem 3D quando existir, senão o desenho em SVG. */
export function NivelIcone({ k, size = 36, entrada, flutua }: Props) {
  const img = NIVEL_IMG[k];
  const xml = useMemo(() => (img ? "" : iconeXml(k)), [k, img]);
  const corpo = img ? (
    <Image source={img} style={{ width: size, height: size }} resizeMode="contain" />
  ) : (
    <SvgXml xml={xml} width={size} height={size} />
  );
  if (entrada == null && !flutua) return corpo;
  return (
    <Movimento size={size} entrada={entrada} flutua={flutua}>
      {corpo}
    </Movimento>
  );
}
