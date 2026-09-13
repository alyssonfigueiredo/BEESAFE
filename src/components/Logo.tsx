import { Text, View } from "react-native";

import { Mark } from "@/components/Mark";

export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const lg = size === "lg";
  return (
    <View className="flex-row items-center gap-3">
      <Mark size={lg ? 60 : 28} />
      <View>
        <Text
          className={`font-display uppercase tracking-widest text-ink ${lg ? "text-5xl" : "text-2xl"}`}
        >
          Iri<Text className="text-yellow">sa</Text>
        </Text>
        {lg && <Text className="font-body text-base text-muted">a cidade vista por você</Text>}
      </View>
    </View>
  );
}
