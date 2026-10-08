import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Busto } from "@/components/irise-personagem/Busto";
import { useProfile } from "@/hooks/useProfile";
import { colors, shadow } from "@/theme/tokens";

/**
 * Prévia (09/10/2026): lembrete do irise no Início, acima do painel da cidade — não mexe no
 * painel nem no resto da tela. Só aparece com um personagem escolhido; texto fixo por ora,
 * sem ligar em nenhum sistema de missão (isso não existe ainda).
 */
export function IriseNudge() {
  const { data: profile } = useProfile();
  const [fechado, setFechado] = useState(false);
  const personagem = profile?.irise_personagem ?? null;
  if (!personagem || fechado) return null;

  return (
    <Animated.View entering={FadeInDown.duration(380)}>
      <View
        className="flex-row items-center gap-3 rounded-3xl bg-surface p-3.5"
        style={shadow.card}
      >
        <Busto personagem={personagem} pose={4} size={56} />
        <Text className="min-w-0 flex-1 font-body text-[13px] leading-[18px] text-ink">
          Já avaliou algum lugar essa semana? Eu ajudo a achar um pertinho.
        </Text>
        <Pressable onPress={() => setFechado(true)} hitSlop={10} accessibilityLabel="Fechar">
          <X color={colors.dim} size={16} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
