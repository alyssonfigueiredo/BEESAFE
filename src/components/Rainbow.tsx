import { Pressable, View } from "react-native";

import { SCALE } from "@/theme/domain";
import { colors } from "@/theme/tokens";

// Marcador de nota da Irisa: o anel da marca desenrolado em cinco faixas, que preenchem da
// esquerda com fração na última. O comprimento diz quanto; o juízo (bom/ruim) fica com o selo e
// o número, que têm cor semântica — aqui a cor é identidade, não avaliação.
type Props = { value: number; size?: number; onChange?: (v: number) => void };

export function Rainbow({ value, size = 8, onChange }: Props) {
  const w = Math.round(size * 3.1);
  const gap = Math.max(2, Math.round(size * 0.34));

  return (
    <View className="flex-row" style={{ gap }}>
      {SCALE.map((color, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        const segment = (
          <View
            style={{
              width: w,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.border,
              overflow: "hidden",
            }}
          >
            {fill > 0 && (
              <View
                style={{
                  width: Math.max(size, w * fill),
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: color,
                }}
              />
            )}
          </View>
        );
        return onChange ? (
          <Pressable
            key={i}
            hitSlop={10}
            onPress={() => onChange(i + 1)}
            accessibilityRole="radio"
            accessibilityState={{ selected: value >= i + 1 }}
            accessibilityLabel={`nota ${i + 1}`}
          >
            {segment}
          </Pressable>
        ) : (
          <View key={i}>{segment}</View>
        );
      })}
    </View>
  );
}
