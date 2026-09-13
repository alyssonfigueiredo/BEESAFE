import { Text, View } from "react-native";

import { BADGES, type Badge as BadgeKey } from "@/theme/domain";

// Selo do lugar: forma e cor juntas, para ler antes de ler o número.
export function Badge({ badge, size = "sm" }: { badge: BadgeKey; size?: "sm" | "lg" }) {
  const { label, color, ink } = BADGES[badge];
  const lg = size === "lg";
  return (
    <View
      className="self-start rounded-md"
      style={{
        backgroundColor: color + (badge === "poucas" ? "" : "2E"),
        paddingHorizontal: lg ? 10 : 8,
        paddingVertical: lg ? 4 : 3,
      }}
    >
      <Text className="font-body-medium" style={{ color: ink, fontSize: lg ? 13 : 11 }}>
        {label}
      </Text>
    </View>
  );
}
