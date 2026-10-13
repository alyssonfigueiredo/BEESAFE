import { Image, View } from "react-native";

import { useCorpoResolvido } from "@/hooks/useIrisePersonagens";
import { colors } from "@/theme/tokens";

/** Prévia do corpo inteiro (300×460, fundo transparente) — usado na apresentação e no admin. */
export function Corpo({ personagem, width }: { personagem: number; width: number }) {
  const height = width * (460 / 300);
  const { source, onError } = useCorpoResolvido(personagem);
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 12,
        overflow: "hidden",
        backgroundColor: colors.subtle,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image source={source} onError={onError} style={{ width, height }} resizeMode="contain" />
    </View>
  );
}
