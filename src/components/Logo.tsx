import { Text, View } from "react-native";

import { Mark } from "@/components/Mark";
import { colors } from "@/theme/tokens";

const SIZES = { sm: 24, lg: 48 } as const;

export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const lg = size === "lg";
  const px = SIZES[size];
  // o amarelo claro some em corpo pequeno sobre papel: abaixo de 20 px o A vai de âmbar
  const accent = px >= 20 ? colors.yellow : colors.amber;

  return (
    <View className="flex-row items-center gap-3">
      <Mark size={lg ? 60 : 28} />
      <View>
        <Text
          className="font-wordmark uppercase text-ink"
          style={{ fontSize: px, letterSpacing: px * 0.15, lineHeight: px * 1.1 }}
        >
          Iris<Text style={{ color: accent }}>a</Text>
        </Text>
        {lg && <Text className="font-body text-base text-muted">quanta cor tem aqui?</Text>}
      </View>
    </View>
  );
}
