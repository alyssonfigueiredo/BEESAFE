import { Text, View } from "react-native";

export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <View className="flex-1 gap-3 bg-night px-6 py-8">
      <Text className="font-display text-3xl uppercase tracking-widest text-ink">{title}</Text>
      <Text className="font-body text-base text-muted">{description}</Text>
    </View>
  );
}
