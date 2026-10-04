import type { LucideIcon } from "lucide-react-native";
import { Pressable, Text } from "react-native";

import { colors, shadow } from "@/theme/tokens";

type Tom = "coral" | "turquoise" | "yellow" | "lilac";

/** Botão principal: cápsula cheia na cor do acento, sombra da própria cor, texto night. */
export function PrimaryButton({
  label,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  tone: Tom;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className="h-[52px] items-center justify-center rounded-full px-6 active:opacity-80 disabled:opacity-50"
      style={[{ backgroundColor: colors[tone] }, shadow[tone]]}
      accessibilityRole="button"
    >
      <Text className="font-body-bold text-base text-night">{label}</Text>
    </Pressable>
  );
}

/** Ação secundária: cápsula branca com fio, ícone e texto na tinta do acento. */
export function SecondaryButton({
  label,
  icon: Icon,
  color = colors.turquoiseInk,
  onPress,
  disabled,
}: {
  label: string;
  icon?: LucideIcon;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className="h-[48px] flex-row items-center justify-center gap-2 rounded-full bg-solid px-5 active:opacity-80 disabled:opacity-50"
      style={shadow.field}
      accessibilityRole="button"
    >
      {Icon && <Icon color={color} size={18} strokeWidth={1.75} />}
      <Text className="font-body-bold text-sm" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}
