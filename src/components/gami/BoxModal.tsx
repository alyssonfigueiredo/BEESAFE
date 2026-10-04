import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

import { FadeUp } from "@/components/gami/Anim";
import { AnimatedMedal } from "@/components/gami/MedalView";
import { useGamification, useOpenBox } from "@/hooks/useGamification";
import { getMedalha, nomeDa, type Banho } from "@/lib/medals";
import { colors } from "@/theme/tokens";
import { useFolhaAberta } from "@/hooks/useDiscovery";

const BANHO: Record<Banho, string> = { neon: "neon", holo: "holográfico", dourado: "dourado" };

/**
 * Caixinha: fica quieta esperando o toque (nada de balançar em loop). Ao abrir, a tampa sobe um
 * pouco e some junto com a caixa, o anel da medalha se desenha até fechar e aí aparece a cor com o
 * banho surpresa (numa medalha que a pessoa já tem). Nada de pulo, cada coisa anima uma vez só.
 */
export function BoxModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useFolhaAberta(visible);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {visible && <Caixa onClose={onClose} />}
    </Modal>
  );
}

function Caixa({ onClose }: { onClose: () => void }) {
  const abrir = useOpenBox();
  const { data: g } = useGamification();
  const reduce = useReducedMotion();
  const [premio, setPremio] = useState<{ medalha: string; banho: Banho } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const lid = useSharedValue(0);

  async function onAbrir() {
    try {
      const r = await abrir.mutateAsync();
      lid.set(withTiming(1, { duration: reduce ? 1 : 420, easing: Easing.out(Easing.cubic) }));
      setTimeout(() => setPremio(r), reduce ? 0 : 420);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu certo agora.");
    }
  }

  const boxStyle = useAnimatedStyle(() => ({ opacity: 1 - lid.get() }));
  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -12 * lid.get() }],
    opacity: 1 - lid.get(),
  }));
  const m = premio ? getMedalha(premio.medalha) : null;

  return (
    <View
      className="flex-1 items-center justify-center gap-5 px-8"
      style={{ backgroundColor: "rgba(20,24,41,0.9)" }}
    >
      <Text
        className="font-body-medium text-[12px] uppercase tracking-wider"
        style={{ color: colors.yellow }}
      >
        {premio ? "Banho surpresa" : "Caixinha"}
      </Text>
      <View style={{ width: 200, height: 200 }} className="items-center justify-center">
        {premio && m ? (
          <AnimatedMedal
            id={premio.medalha}
            size={190}
            banho={premio.banho}
            reveal
            delay={100}
            duration={1100}
          />
        ) : (
          <FadeUp
            distance={12}
            duration={400}
            style={{ width: 200, height: 200, alignItems: "center", justifyContent: "center" }}
          >
            <Animated.View style={[{ position: "absolute" }, boxStyle]}>
              <Svg width={200} height={200} viewBox="0 0 200 200">
                <Defs>
                  <LinearGradient id="cx-g" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.coral} />
                    <Stop offset="0.5" stopColor={colors.orange} />
                    <Stop offset="1" stopColor={colors.lilac} />
                  </LinearGradient>
                </Defs>
                <Rect x={40} y={88} width={120} height={92} rx={14} fill="url(#cx-g)" />
                <Rect x={92} y={88} width={16} height={92} fill={colors.yellow} />
              </Svg>
            </Animated.View>
            <Animated.View style={[{ position: "absolute" }, lidStyle]}>
              <Svg width={200} height={200} viewBox="0 0 200 200">
                <Rect x={30} y={64} width={140} height={32} rx={10} fill="#FF8A85" />
                <Rect x={92} y={64} width={16} height={32} fill={colors.yellow} />
                <Path
                  d="M100 64c-14-26-44-18-30-2M100 64c14-26 44-18 30-2"
                  fill="none"
                  stroke={colors.yellow}
                  strokeWidth={8}
                  strokeLinecap="round"
                />
              </Svg>
            </Animated.View>
          </FadeUp>
        )}
      </View>
      <FadeUp key={premio ? "premio" : "caixa"} delay={premio && !reduce ? 1100 : 0}>
        <Text className="text-center font-display text-[32px] uppercase text-paper">
          {premio && m ? `${nomeDa(m, g?.forma ?? 2)} ${BANHO[premio.banho]}` : "Sua caixinha"}
        </Text>
        <Text
          className="mt-5 text-center font-body text-[15px] leading-[21px]"
          style={{ color: "#C9CDE0" }}
        >
          {erro ??
            (premio
              ? "Um acabamento novo numa medalha que você já tem."
              : "Toque para abrir. O que sai nunca é previsível.")}
        </Text>
      </FadeUp>
      {premio || erro ? (
        <Pressable
          onPress={onClose}
          className="w-64 items-center rounded-full bg-paper py-3.5 active:opacity-80"
        >
          <Text className="font-body-bold text-[15px] text-night">Fechar</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={onAbrir}
          disabled={abrir.isPending}
          className="w-64 items-center rounded-full bg-yellow py-3.5 active:opacity-80 disabled:opacity-60"
        >
          <Text className="font-body-bold text-[15px] text-night">
            {abrir.isPending ? "Abrindo…" : "Abrir a caixinha"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
