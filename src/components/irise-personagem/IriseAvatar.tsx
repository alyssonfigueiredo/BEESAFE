import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { bustoSrc, BUSTO_ASPECTO } from "@/lib/irisePersonagens";
import { colors, mark } from "@/theme/tokens";

/**
 * Avatar do protótipo aprovado (10/10/2026): o busto sai do círculo. O corpo é cortado pela curva
 * de baixo do círculo e a cabeça passa por cima da borda. Altura total = size * 1.24.
 * Não substitui o Busto (que continua nas miniaturas e cartões).
 */
export function IriseAvatar({
  personagem,
  pose = 1,
  size,
  anel = true,
  cinza = false,
}: {
  personagem: number;
  pose?: number;
  size: number;
  anel?: boolean;
  /** vizinhos do carrossel: sem anel, apagado */
  cinza?: boolean;
}) {
  const altura = size * 1.24;
  const r = (size - 6) / 2;
  const imgW = size * 1.12;
  const imgH = imgW * BUSTO_ASPECTO;
  return (
    <View style={{ width: size, height: altura, opacity: cinza ? 0.45 : 1 }}>
      <View style={{ position: "absolute", left: 0, bottom: 0, width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="iaRing" x1="0" y1="0" x2="1" y2="1">
              {mark.ring.map((c, i) => (
                <Stop key={c} offset={i / (mark.ring.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 1.5}
            fill={cinza ? colors.subtle : colors.solid}
            stroke={anel && !cinza ? "url(#iaRing)" : colors.border}
            strokeWidth={3}
          />
        </Svg>
      </View>
      <View
        style={{
          position: "absolute",
          left: 3,
          right: 3,
          top: 0,
          bottom: 3,
          overflow: "hidden",
          borderBottomLeftRadius: r,
          borderBottomRightRadius: r,
        }}
      >
        <Image
          source={bustoSrc(pose, personagem)}
          style={{
            position: "absolute",
            top: 0,
            left: (size - 6 - imgW) / 2,
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
