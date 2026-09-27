import { Pressable, Text } from "react-native";

import { onLight } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

/**
 * Chip tonal, sem borda. Sem `color`: fundo subtle e, ativo, tinta com texto claro.
 * Com `color`: fundo na cor a 18 % e texto na versão escura; ativo, fundo cheio e texto night.
 */
export function Chip({
  label,
  active,
  onPress,
  color,
  grow,
  glass,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  color?: string;
  grow?: boolean;
  /** Sobre o mapa: fundo branco translúcido com sombra, em vez do tonal. */
  glass?: boolean;
}) {
  const base = glass ? "rgba(255,255,255,0.78)" : colors.subtle;
  const bg = color ? (active ? color : glass ? base : color + "2E") : active ? colors.ink : base;
  const fg = color ? (active ? colors.night : onLight(color)) : active ? "#FFFFFF" : colors.muted;
  return (
    <Pressable
      onPress={onPress}
      className={`items-center rounded-full px-3 py-2 active:opacity-80 ${grow ? "flex-1" : ""}`}
      style={[{ backgroundColor: bg }, glass ? shadow.card : null]}
    >
      <Text className="font-body-medium text-xs" style={{ color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}
