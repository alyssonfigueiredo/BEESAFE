import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { Busto } from "@/components/irise-personagem/Busto";
import { colors, shadow } from "@/theme/tokens";

/**
 * Avatar grande da tela "Escolha seu irise": disco branco + anel arco-íris + busto, igual ao
 * protótipo aprovado (ring + disc do avpop). Só usado aqui — nos outros lugares o Busto sozinho
 * (já com fundo branco) basta.
 */
export function HeroAvatar({ personagem, size }: { personagem: number; size: number }) {
  const inner = size - 10;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="heroRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.coral} />
            <Stop offset="0.25" stopColor={colors.yellow} />
            <Stop offset="0.5" stopColor={colors.turquoise} />
            <Stop offset="0.75" stopColor="#59A7FF" />
            <Stop offset="1" stopColor={colors.lilac} />
          </LinearGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 1.5}
          stroke="url(#heroRing)"
          strokeWidth={3}
          fill="none"
        />
      </Svg>
      <View style={{ borderRadius: inner / 2 }} className="bg-solid" >
        <View style={shadow.card}>
          <Busto personagem={personagem} size={inner} />
        </View>
      </View>
    </View>
  );
}
