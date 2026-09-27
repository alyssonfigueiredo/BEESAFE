import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from "react-native-svg";

import { fonts, mark } from "@/theme/tokens";

/** Texto pintado com o arco-íris da marca (a pergunta "Quanta cor tem esse lugar?"). */
export function RainbowText({
  children,
  size = 20,
  family = fonts.bodyBold,
}: {
  children: string;
  size?: number;
  family?: string;
}) {
  const id = "rbt";
  return (
    <Svg height={size * 1.3} width="100%">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {mark.ring.map((c, i) => (
            <Stop key={c} offset={i / (mark.ring.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <SvgText x={0} y={size} fontSize={size} fontFamily={family} fill={`url(#${id})`}>
        {children}
      </SvgText>
    </Svg>
  );
}
