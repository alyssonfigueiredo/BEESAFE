import { Text, View } from "react-native";

export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "text-5xl" : "text-2xl";
  return (
    <View>
      <Text className={`font-display uppercase tracking-widest text-ink ${cls}`}>
        Iri<Text className="text-yellow">sa</Text>
      </Text>
      {size === "lg" && (
        <Text className="font-body text-base text-muted">a cidade vista por você</Text>
      )}
    </View>
  );
}
