import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useProfile } from "@/hooks/useProfile";
import { colors, shadow } from "@/theme/tokens";

/**
 * Prévia (09/10/2026): liga/desliga as dicas do irise nas telas (aba nova, aviso de área etc.).
 * Só aparece com um personagem escolhido. Estado local por ora — nada grava ainda, igual ao
 * resto da prévia do personagem.
 */
export function DicasToggle() {
  const { data: profile } = useProfile();
  const [ligado, setLigado] = useState(true);
  if (!profile?.irise_personagem) return null;

  return (
    <Pressable
      onPress={() => setLigado((v) => !v)}
      className="flex-row items-start justify-between gap-4 rounded-[24px] bg-surface px-5 py-4"
      style={shadow.card}
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-body-bold text-[14px] text-ink">Dicas do irise nas telas</Text>
        <Text className="font-body text-xs leading-[17px] text-dim">
          Aparece quando você entra numa aba nova.
        </Text>
      </View>
      <View
        className="h-[26px] w-[44px] justify-center rounded-full px-[3px]"
        style={{ backgroundColor: ligado ? colors.turquoise : colors.border }}
      >
        <View
          className="h-5 w-5 rounded-full bg-solid"
          style={[shadow.field, { alignSelf: ligado ? "flex-end" : "flex-start" }]}
        />
      </View>
    </Pressable>
  );
}
