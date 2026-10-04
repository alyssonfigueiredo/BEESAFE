import { useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Animated, {
  FadeInDown,
  SlideInDown,
  ZoomIn,
  useReducedMotion,
} from "react-native-reanimated";

import { MedalView } from "@/components/gami/MedalView";
import { SliceRing } from "@/components/gami/Rings";
import { quaseLa, setRewardOpen, useGamification } from "@/hooks/useGamification";
import { getMedalha, NIVEIS, nomeDa } from "@/lib/medals";
import { colors, shadow } from "@/theme/tokens";

/**
 * Folha que sobe depois de enviar uma avaliação nova: o gomo aceso, a faísca e a medalha mais
 * perto de sair. Sem a gamificação no banco, mostra só o agradecimento de sempre.
 * Com `frase` (avaliação que veio da descoberta), o título é a frase e o gomo vira uma linha
 * pequena embaixo: sem "+1 gomo" grande.
 */
export function RewardSheet({
  visible,
  antes,
  frase,
  onClose,
}: {
  visible: boolean;
  antes: number | null;
  frase?: string;
  onClose: () => void;
}) {
  const { data: g, isFetching } = useGamification();
  const reduce = useReducedMotion();

  useEffect(() => {
    setRewardOpen(visible);
    return () => setRewardOpen(false);
  }, [visible]);

  const ganhou = g && antes != null ? Math.max(0, g.gomos - antes) : null;
  const semanaCheia = !!g && g.gomos_semana != null && g.gomos_semana >= (g.gomos_semana_max ?? 4);
  const quase = quaseLa(g);
  const qm = quase ? getMedalha(quase.id) : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1"
        style={{ backgroundColor: "rgba(20,24,41,0.38)" }}
        onPress={onClose}
      />
      <Animated.View
        entering={reduce ? undefined : SlideInDown.springify().damping(18)}
        className="absolute bottom-0 left-0 right-0 items-center gap-1 rounded-t-[34px] px-6 pb-10 pt-3"
        style={{ backgroundColor: "#FBFCFE" }}
      >
        <View className="h-[5px] w-11 rounded-full" style={{ backgroundColor: "#D5DDE7" }} />
        {g ? (
          <>
            <Animated.View
              entering={reduce ? undefined : ZoomIn.springify().delay(200)}
              style={{ marginTop: 18 }}
            >
              <SliceRing lit={g.gomos} size={frase ? 104 : 132} />
            </Animated.View>
            {frase ? (
              <>
                <Text className="mt-3 text-center font-display text-[24px] uppercase leading-[28px] text-ink">
                  {frase}
                </Text>
                <Text className="mt-1 text-center font-body text-[13px] text-muted">
                  {ganhou ? `+${ganhou} gomo${ganhou > 1 ? "s" : ""} no seu anel · ` : ""}
                  {g.gomos} de 48{g.nivel > 0 ? ` · ${NIVEIS[g.nivel]}` : ""}
                </Text>
              </>
            ) : (
              <>
                <Text className="mt-2 font-display text-[32px] uppercase text-ink">
                  {ganhou ? `+${ganhou} gomo${ganhou > 1 ? "s" : ""}` : "Avaliação enviada"}
                </Text>
                <Text className="font-body text-[14px] text-muted">
                  Já está no mapa. {g.gomos} de 48{g.nivel > 0 ? ` · ${NIVEIS[g.nivel]}` : ""}.
                </Text>
              </>
            )}
            {!ganhou && semanaCheia && (
              <Text className="mt-1 text-center font-body text-[13px] text-dim">
                Os gomos desta semana já acenderam. Segunda tem mais.
              </Text>
            )}
            <View className="mt-4 w-full flex-row gap-2">
              <Animated.View
                entering={reduce ? undefined : FadeInDown.delay(350)}
                className="flex-1 items-center rounded-2xl bg-subtle px-2 py-3"
              >
                <Text className="font-display text-[22px] text-ink">{g.faiscas.rumo}</Text>
                <Text className="text-center font-body text-[11.5px] text-muted">
                  faíscas de 10
                </Text>
              </Animated.View>
              <Animated.View
                entering={reduce ? undefined : FadeInDown.delay(450)}
                className="flex-1 items-center rounded-2xl bg-subtle px-2 py-3"
              >
                <Text className="font-display text-[22px] text-ink">+1</Text>
                <Text className="text-center font-body text-[11.5px] text-muted">cor no mapa</Text>
              </Animated.View>
              {quase && qm && (
                <Animated.View
                  entering={reduce ? undefined : FadeInDown.delay(550)}
                  className="flex-1 items-center rounded-2xl bg-subtle px-2 py-3"
                >
                  <Text className="font-display text-[22px] text-ink">
                    {quase.valor}/{quase.alvo}
                  </Text>
                  <Text
                    className="text-center font-body text-[11.5px] text-muted"
                    numberOfLines={1}
                  >
                    {nomeDa(qm, g.forma)}
                  </Text>
                </Animated.View>
              )}
            </View>
            {quase && qm && (
              <View
                className="mt-3 flex-row items-center gap-3 self-stretch rounded-2xl bg-surface px-3 py-2"
                style={shadow.card}
              >
                <MedalView
                  id={quase.id}
                  size={44}
                  on={false}
                  prog={quase.valor / quase.alvo}
                  lockIcon={false}
                />
                <Text className="flex-1 font-body text-[13px] text-muted">
                  Faltam {quase.alvo - quase.valor} para {nomeDa(qm, g.forma)}.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View className="items-center gap-2 py-8">
            <Text
              className={`text-center font-display uppercase text-ink ${frase ? "text-[24px] leading-[28px]" : "text-[28px]"}`}
            >
              {frase ?? (isFetching ? "Enviando…" : "Avaliação registrada")}
            </Text>
            <Text className="font-body text-[14px] text-muted">
              Obrigado por ajudar a comunidade.
            </Text>
          </View>
        )}
        <Pressable
          onPress={onClose}
          className="mt-5 w-full items-center rounded-full py-3.5 active:opacity-80"
          style={{ backgroundColor: colors.night }}
        >
          <Text className="font-body-bold text-[15px] text-paper">Continuar</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
