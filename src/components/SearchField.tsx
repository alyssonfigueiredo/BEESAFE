import { Search } from "lucide-react-native";
import { TextInput, type TextInputProps } from "react-native";

import { Glass } from "@/components/Glass";
import { colors } from "@/theme/tokens";

/** Campo de busca em cápsula de vidro. */
export function SearchField(props: TextInputProps) {
  return (
    <Glass
      style={{
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 14,
      }}
    >
      <Search color={colors.dim} size={18} />
      <TextInput
        className="flex-1 py-3 font-body text-base text-ink"
        placeholderTextColor={colors.dim}
        autoCorrect={false}
        returnKeyType="search"
        {...props}
      />
    </Glass>
  );
}
