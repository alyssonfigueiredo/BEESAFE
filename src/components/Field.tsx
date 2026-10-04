import type { LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, shadow } from "@/theme/tokens";

/** Círculo claro com ícone em linha, o mesmo dos campos e das linhas de lista. */
export function IconDot({
  icon: Icon,
  color = colors.muted,
}: {
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <View
      className="h-9 w-9 items-center justify-center rounded-full"
      style={{ backgroundColor: colors.subtle }}
    >
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
        {/* Centra na vertical o que não é TextInput (ex.: o seletor de cidade). */}
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

/** Campo de várias linhas: o mesmo branco com fio do Field, cantos de 20. */
export function TextArea({ minHeight = 112, ...input }: TextInputProps & { minHeight?: number }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      {...input}
      className="rounded-[20px] bg-solid px-4 py-3 font-body text-[15px] leading-[21px] text-ink"
      style={[{ minHeight }, focused ? shadow.fieldFocus : shadow.field]}
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
  );
}

/**
 * Bloco de formulário: etiqueta pequena em cima. A dica curta ("opcional", "12/2000") fica à
 * direita e encolhe; a longa (`note`) vai na linha de baixo, para nunca passar da borda da tela.
 */
export function FormSection({
  label,
  hint,
  note,
  children,
}: {
  label: string;
  hint?: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="gap-0.5">
        <View className="flex-row items-baseline gap-3">
          <Text className="font-body-bold text-xs text-muted">{label}</Text>
          {!!hint && (
            <Text className="min-w-0 flex-1 text-right font-body text-xs text-dim">{hint}</Text>
          )}
        </View>
        {!!note && <Text className="font-body text-xs leading-[17px] text-dim">{note}</Text>}
      </View>
      {children}
    </View>
  );
}
