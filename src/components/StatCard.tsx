import { Text, View } from "react-native";

export function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <View className="min-w-0 flex-1 gap-1 rounded-xl border border-border bg-surface p-4">
      <Text className="font-body text-xs uppercase tracking-wider text-dim">{label}</Text>
      <Text
        className="font-display text-2xl text-ink"
        style={color ? { color } : undefined}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
