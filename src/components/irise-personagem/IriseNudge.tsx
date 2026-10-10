import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AnelArcoIris } from "@/components/irise/Irise";
import { abrirEscolhaIrise } from "@/components/irise-personagem/IriseCard";
import { useAppConfig, useForma } from "@/hooks/useGamification";
import { useProfile } from "@/hooks/useProfile";
import { colors, shadow } from "@/theme/tokens";

/**
 * Convite pra escolher um irise (gap sinalizado em 10/10/2026: não havia nenhum clique na Início
 * pra quem ainda não tinha personagem). Mesmo visual do antigo lembrete que ficava só pra quem já
 * tinha irise escolhido — o balão do `CardCidadeIrise` já cumpre esse papel agora, então os dois
 * nunca aparecem juntos: este só aparece SEM personagem.
 */
export function IriseNudge() {
  const { data: cfg } = useAppConfig();
  const { data: profile } = useProfile();
  const forma = useForma();
  const [fechado, setFechado] = useState(false);
  const semPersonagem = !profile?.irise_personagem;
  if (!cfg?.irise_ativa || !semPersonagem || fechado) return null;

  return (
    <Animated.View entering={FadeInDown.duration(380)}>
      <Pressable
        onPress={() => abrirEscolhaIrise({ atual: null, forma, primeiraVez: true })}
        className="flex-row items-center gap-3 rounded-3xl bg-surface p-3.5 active:opacity-90"
        style={shadow.card}
      >
        <View style={{ width: 56, height: 56 }}>
          <AnelArcoIris size={56} />
          <View
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            className="items-center justify-center"
          >
            <Text className="font-body-bold text-xl text-solid">?</Text>
          </View>
        </View>
        <Text className="min-w-0 flex-1 font-body text-[13px] leading-[18px] text-ink">
          Escolha um irise pra te acompanhar no app.
        </Text>
        <Pressable onPress={() => setFechado(true)} hitSlop={10} accessibilityLabel="Fechar">
          <X color={colors.dim} size={16} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}
