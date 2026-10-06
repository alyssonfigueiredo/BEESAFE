import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { useSvgId } from "@/components/gami/Anim";
import { useFavoritos, useToggleFavorito } from "@/hooks/useFavoritos";
import { colors, shadow } from "@/theme/tokens";

// Coração do Quero ir: traço arco-íris, enche de arco-íris quando salvo, com um pulinho e seis
// pontinhos de cor saindo (uma vez, no toque). "mini" vai no canto de cima da foto do cartão;
// "solid" no canto de cima da ficha do lugar; "plain" sem fundo.

const RB = [colors.coral, colors.orange, colors.yellow, colors.turquoise, "#59A7FF", colors.lilac];
const HEART =
  "M12 20.4s-7.6-4.6-9.5-9.1C1 7.9 3.4 4.8 6.8 4.8c2.1 0 3.7 1.2 5.2 3.1 1.5-1.9 3.1-3.1 5.2-3.1 3.4 0 5.8 3.1 4.3 6.5-1.9 4.5-9.5 9.1-9.5 9.1z";

export function HeartIcon({ on, size = 22 }: { on: boolean; size?: number }) {
  const id = useSvgId("fav");
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          {RB.map((c, i) => (
            <Stop key={c} offset={i / (RB.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <Path
        d={HEART}
        fill={on ? `url(#${id})` : "none"}
        stroke={`url(#${id})`}
        strokeWidth={2.3}
        strokeLinejoin="round"
      />
      {on && (
        <Path
          d="M7.2 8.6c.6-.9 1.6-1.3 2.5-1"
          stroke="#FFFFFF"
          strokeWidth={1.6}
          strokeLinecap="round"
          fill="none"
          opacity={0.8}
        />
      )}
    </Svg>
  );
}

function Ponto({ i }: { i: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }));
  }, [t]);
  const a = (i / RB.length) * Math.PI * 2 - Math.PI / 2;
  const st = useAnimatedStyle(() => ({
    opacity: t.get() <= 0 || t.get() >= 1 ? 0 : 1 - t.get(),
    transform: [
      { translateX: Math.cos(a) * 20 * t.get() },
      { translateY: Math.sin(a) * 20 * t.get() },
      { scale: 1 - 0.6 * t.get() },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: RB[i] },
        st,
      ]}
    />
  );
}

export function FavHeart({
  placeId,
  variant = "plain",
}: {
  placeId: string;
  variant?: "mini" | "solid" | "plain";
}) {
  const { data: favs } = useFavoritos();
  const toggle = useToggleFavorito();
  const reduce = useReducedMotion();
  const escala = useSharedValue(1);
  const [burst, setBurst] = useState(0);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: escala.get() }] }));
  // Sem a tabela no banco, o recurso não existe: nada aparece.
  if (favs == null) return null;
  const on = favs.some((f) => f.place_id === placeId && !f.visitado_em);

  function tocar() {
    toggle.mutate({ placeId, on: !on });
    if (reduce) return;
    escala.set(
      withSequence(
        withTiming(1.3, { duration: 160, easing: Easing.out(Easing.cubic) }),
        withTiming(0.92, { duration: 140 }),
        withTiming(1, { duration: 160 }),
      ),
    );
    if (!on) setBurst((b) => b + 1);
  }

  const lado = variant === "mini" ? 28 : variant === "solid" ? 40 : 36;
  const icone = variant === "mini" ? 16 : 22;
  return (
    <Pressable
      onPress={tocar}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={on ? "Tirar do Quero ir" : "Salvar em Quero ir"}
      style={[
        {
          width: lado,
          height: lado,
          borderRadius: lado / 2,
          alignItems: "center",
          justifyContent: "center",
        },
        variant !== "plain" && { backgroundColor: "#FFFFFF" },
        variant === "mini" && { boxShadow: "0 2px 8px rgba(20,24,41,0.18)" },
        variant === "solid" && shadow.card,
      ]}
    >
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        {burst > 0 && RB.map((_, i) => <Ponto key={`${burst}-${i}`} i={i} />)}
        <Animated.View style={st}>
          <HeartIcon on={on} size={icone} />
        </Animated.View>
      </View>
    </Pressable>
  );
}
