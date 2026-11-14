import { StyleSheet, View } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

import { faseTrans } from "@/lib/semanaTrans";
import { aurora as auroraPadrao, colors } from "@/theme/tokens";

// Semana da Visibilidade Trans (13–19/11/2026): as manchas do fundo trocam para azul e rosa da
// bandeira, com um clarão branco no meio. Volta sozinho depois de 19/11.
const AURORA_TRANS = [
  { x: -0.08, y: -0.04, r: 0.7, color: "#5BCEFA", alpha: 0.5 },
  { x: 1.08, y: 0.06, r: 0.6, color: "#F5A9B8", alpha: 0.52 },
  { x: 0.5, y: 0.46, r: 0.6, color: "#FFFFFF", alpha: 0.85 },
  { x: 1.06, y: 1.04, r: 0.62, color: "#5BCEFA", alpha: 0.42 },
  { x: -0.06, y: 1.02, r: 0.56, color: "#F5A9B8", alpha: 0.48 },
];

/** Fundo das telas: papel com as manchas de cor do story, paradas atrás do conteúdo que rola. */
export function Aurora() {
  const aurora = faseTrans() === "semana" ? AURORA_TRANS : auroraPadrao;
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
