import type { LucideIcon } from "lucide-react-native";
import { Text, View } from "react-native";

import { onLight } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

/** Rótulo com ícone tonal no canto, número grande, linha de apoio. */
export function StatCard({
  label,
  value,
  color,
  icon: Icon,
  note,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: LucideIcon;
  note?: string;
}) {
  const tint = color ?? colors.turquoise;
  return (
    <View className="min-w-0 flex-1 gap-2 rounded-3xl bg-surface p-4" style={shadow.card}>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-body-medium text-[13px] text-muted" numberOfLines={1}>
          {label}
        </Text>
        {Icon && (
          <View
            className="h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: tint + "33" }}
          >
            <Icon color={onLight(tint)} size={16} />
          </View>
        )}
      </View>
      <Text
        className="font-display text-3xl text-ink"
        style={color ? { color: onLight(color) } : undefined}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {!!note && <Text className="font-body text-xs text-dim">{note}</Text>}
    </View>
  );
}
