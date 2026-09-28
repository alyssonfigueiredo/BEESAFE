import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { aurora, colors } from "@/theme/tokens";

/** Fundo das telas: papel com as manchas de cor do story, paradas atrás do conteúdo que rola. */
export function Aurora() {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.paper }]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          {aurora.map((a, i) => (
            <RadialGradient key={i} id={`au${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={a.color} stopOpacity={a.alpha} />
              <Stop offset="1" stopColor={a.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {aurora.map((a, i) => (
          <Ellipse
            key={i}
            cx={a.x * 100}
            cy={a.y * 100}
            rx={a.r * 60}
            ry={a.r * 42}
            fill={`url(#au${i})`}
          />
        ))}
      </Svg>
    </View>
  );
}
