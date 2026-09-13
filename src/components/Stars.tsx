import { Star } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { placeScoreColor } from "@/theme/domain";
import { colors } from "@/theme/tokens";

type Props = { value: number; size?: number; onChange?: (v: number) => void; color?: string };

export function Stars({ value, size = 18, onChange, color }: Props) {
  const tint = color ?? placeScoreColor(value);
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = value >= n - 0.25;
        const star = (
          <Star
            size={size}
            color={filled ? tint : colors.border}
            fill={filled ? tint : "transparent"}
            strokeWidth={1.5}
          />
        );
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}
