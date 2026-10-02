import type { LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, shadow } from "@/theme/tokens";

/** Círculo claro com ícone em linha, o mesmo dos campos e das linhas de lista. */
export function IconDot({ icon: Icon, color = colors.muted }: { icon: LucideIcon; color?: string }) {
  return (
    <View className="h-9 w-9 items-center justify-center rounded-full bg-paper">
      <Icon color={color} size={18} strokeWidth={1.75} />
    </View>
  );
}

/** Cápsula branca no lugar do campo cinza: etiqueta em cima, ícone em círculo à esquerda. */
export function FieldShell({
  label,
  icon,
  focused,
  children,
}: {
  label?: string;
  icon: LucideIcon;
  focused?: boolean;
  children: ReactNode;
}) {
  return (
    <View className="gap-1.5">
      {!!label && <Text className="ml-4 font-body text-xs text-dim">{label}</Text>}
      <View
        className="h-[50px] flex-row items-center gap-3 rounded-full bg-solid pl-[7px] pr-4"
        style={focused ? shadow.fieldFocus : shadow.field}
      >
        <IconDot icon={icon} />
        {children}
      </View>
    </View>
  );
}

export function Field({
  label,
  icon,
  right,
  ...input
}: TextInputProps & { label?: string; icon: LucideIcon; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldShell label={label} icon={icon} focused={focused}>
      <TextInput
        {...input}
        className="h-full flex-1 font-body text-[15px] text-ink"
        placeholderTextColor={colors.dim}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
      />
      {right}
    </FieldShell>
  );
}
