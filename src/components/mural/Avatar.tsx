import { useId } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

const RAINBOW = ["#FF6964", "#FFA353", "#FFD066", "#49DCC0", "#59A7FF", "#A889FF"];

/** Inicial do apelido dentro do anel arco-íris (sem foto: o mural mostra só o apelido). */
export function RainbowAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const id = `av${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  const ring = Math.max(2, Math.round(size / 18));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            {RAINBOW.map((c, i) => (
              <Stop key={c} offset={i / (RAINBOW.length - 1)} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
      <View
        className="items-center justify-center rounded-full bg-solid"
        style={{ position: "absolute", top: ring, left: ring, right: ring, bottom: ring }}
      >
        <Text className="font-display text-ink" style={{ fontSize: size * 0.42 }}>
          {initial}
        </Text>
      </View>
    </View>
  );
}
