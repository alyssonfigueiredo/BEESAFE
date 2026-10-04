import { Coffee, Heart, Lightbulb, type LucideIcon } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { SupportCategory } from "@/theme/domain";
import { shadow } from "@/theme/tokens";

import { RainbowAvatar } from "./Avatar";
import { CATEGORY_ORDER, NOTE_TINT } from "./theme";

const ICON: Record<SupportCategory, LucideIcon> = {
  acolhimento: Heart,
  dica: Lightbulb,
  pedido_ajuda: Coffee,
};

/** Entrada do mural: campo de mentira que abre a folha e os três atalhos grandes. */
export function ComposerCard({
  nickname,
  onOpen,
}: {
  nickname: string;
  onOpen: (category: SupportCategory) => void;
}) {
  return (
    <View className="gap-2.5 rounded-3xl bg-surface p-3.5" style={shadow.card}>
      <Pressable
        onPress={() => onOpen("acolhimento")}
        className="h-12 flex-row items-center gap-2.5 rounded-full bg-solid px-1.5 active:opacity-80"
        style={{ boxShadow: "0 1px 2px rgba(20,24,41,0.05)" }}
        accessibilityRole="button"
        accessibilityLabel="Escrever para a comunidade"
      >
        <RainbowAvatar name={nickname || "Anônimo"} />
        <Text className="font-body text-[15px] text-dim">Escreva para a comunidade…</Text>
      </Pressable>
      <View className="flex-row gap-1.5">
        {CATEGORY_ORDER.map((k) => {
          const t = NOTE_TINT[k];
          const Icon = ICON[k];
          return (
            <Pressable
              key={k}
              onPress={() => onOpen(k)}
              className="flex-1 items-center gap-1 rounded-2xl px-1 py-2.5 active:opacity-80"
              style={{ backgroundColor: t.paper }}
              accessibilityRole="button"
            >
              <Icon size={20} color={t.ink} strokeWidth={2} />
              <Text className="text-center font-body-bold text-xs" style={{ color: t.ink }}>
                {t.quick}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text className="text-center font-body text-[11.5px] leading-4 text-dim">
        Aparece só o seu apelido, ou Anônimo se preferir. Apoiar alguém no dia vale{" "}
        <Text className="font-body-bold" style={{ color: "#8F6300" }}>
          +1 faísca
        </Text>
        .
      </Text>
    </View>
  );
}
