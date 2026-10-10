import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from "react-native-svg";

import { useBustoResolvido } from "@/hooks/useIrisePersonagens";
import { BUSTO_ASPECTO } from "@/lib/irisePersonagens";
import { colors, mark } from "@/theme/tokens";

/**
 * Avatar do protótipo aprovado (10/10/2026): o busto sai do círculo. O corpo é cortado pela curva
 * de baixo do círculo e a cabeça passa por cima da borda. Altura total = size * 1.3.
 * Espessura do anel = 2,4% do size (6 px num avatar de 250). Não substitui o Busto (que continua
 * nas miniaturas e cartões).
 */
export function IriseAvatar({
  personagem,
  pose = 1,
  size,
  anel = true,
  cinza = false,
  fundo = "claro",
}: {
  personagem: number;
  pose?: number;
  size: number;
  anel?: boolean;
  /** vizinhos do carrossel: sem anel, apagado */
  cinza?: boolean;
  /** Pra usar em cima do card/faixa/pílula escuros (personagem fora dos 9 originais, que não tem
   * a versão `avatar-card`/`-escuro` pronta — ver `iriseImagensEscuras.ts`). O miolo do anel vira
   * a cor do card em vez de branco; o resto não muda. */
  fundo?: "claro" | "escuro";
}) {
  const altura = size * 1.3;
  const espessura = size * 0.024;
  const r = size / 2 - espessura;
  const imgW = size * 1.12;
  const imgH = imgW * BUSTO_ASPECTO;
  const { source, onError } = useBustoResolvido(pose, personagem);

  const reduzido = useReducedMotion();
  const giro = useSharedValue(0);
  useEffect(() => {
    if (reduzido) return;
    giro.set(withRepeat(withTiming(360, { duration: 40000, easing: Easing.linear }), -1));
  }, [giro, reduzido]);
  const estiloGiro = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.get()}deg` }] }));

  return (
    <View style={{ width: size, height: altura, opacity: cinza ? 0.45 : 1 }}>
      <Animated.View
        style={[
          { position: "absolute", left: 0, bottom: 0, width: size, height: size },
          anel && !cinza ? estiloGiro : null,
        ]}
      >
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="iaRing" x1="0" y1="0" x2="1" y2="1">
              {mark.ring.map((c, i) => (
                <Stop key={c} offset={i / (mark.ring.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
            <RadialGradient id="iaFundo" cx="50%" cy="30%" r="75%">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#ECE5FF" />
            </RadialGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - espessura / 2}
            fill={cinza ? colors.subtle : fundo === "escuro" ? "#171A2B" : "url(#iaFundo)"}
            stroke={anel && !cinza ? "url(#iaRing)" : colors.border}
            strokeWidth={espessura}
          />
        </Svg>
      </Animated.View>
      <View
        style={{
          position: "absolute",
          left: espessura,
          right: espessura,
          top: 0,
          bottom: espessura,
          overflow: "hidden",
          borderBottomLeftRadius: r,
          borderBottomRightRadius: r,
        }}
      >
        <Image
          source={source}
          onError={onError}
          style={{
            position: "absolute",
            top: 0,
            left: (size - espessura * 2 - imgW) / 2,
            width: imgW,
            height: imgH,
          }}
          resizeMode="cover"
        />
        {cinza && (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(241,245,250,0.55)" }]}
          />
        )}
      </View>
    </View>
  );
}
