import { useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { Counter, FadeUp, ProgressEdge } from "@/components/gami/Anim";
import { AnimatedMedal } from "@/components/gami/MedalView";
import { SliceRing } from "@/components/gami/Rings";
import { quaseLa, setRewardOpen, useGamification } from "@/hooks/useGamification";
import { getMedalha, NIVEIS, nomeDa } from "@/lib/medals";
import { colors, shadow } from "@/theme/tokens";

/**
 * Folha que sobe depois de enviar uma avaliação nova: o gomo aceso, a faísca e a medalha mais
 * perto de sair. Sem a gamificação no banco, mostra só o agradecimento de sempre.
 * Com `frase` (avaliação que veio da descoberta), o título é a frase e o gomo vira uma linha
 * pequena embaixo: sem "+1 gomo" grande.
 *
 * Tudo calmo e uma vez só: a folha chega (sobe 12 px aparecendo), a borda arco-íris se desenha em
 * volta do cartão do anel, os gomos enchem um a um, os números contam e os textos aparecem.
 * Nada pula, nada fica se mexendo depois. Com "reduzir movimento", tudo já no estado final.
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

  // Linha do tempo (ms depois de abrir). O anel enche em ~1,1 s, por mais gomos que tenha.
  const lit = g?.gomos ?? 0;
  const passo = Math.max(18, Math.min(60, Math.round(1100 / Math.max(1, lit))));
  const T_BORDA = 220;
  const T_ANEL = 420;
  const T_FIM_ANEL = T_ANEL + Math.max(0, lit - 1) * passo + 260;
  const T_TEXTO = 520;
  const T_CARTOES = Math.min(T_FIM_ANEL, 1500);
  const d = (ms: number) => (reduce ? 0 : ms);

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
      <FadeUp
        duration={360}
        distance={12}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          gap: 4,
          borderTopLeftRadius: 34,
          borderTopRightRadius: 34,
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: 12,
          backgroundColor: "#FBFCFE",
        }}
      >
        <View className="h-[5px] w-11 rounded-full" style={{ backgroundColor: "#D5DDE7" }} />
        {g ? (
          <>
            <View
              className="mt-4 items-center self-stretch rounded-[28px] px-4 pb-4 pt-5"
              style={{ position: "relative" }}
            >
              <ProgressEdge
                frac={1}
                radius={28}
                strokeWidth={3}
                delay={d(T_BORDA)}
                duration={1100}
              />
              <SliceRing
                lit={lit}
                size={frase ? 104 : 132}
                animate={!reduce}
                delay={T_ANEL}
                step={passo}
              />
              {frase ? (
                <FadeUp delay={d(T_TEXTO)} style={{ alignItems: "center" }}>
                  <Text className="mt-3 text-center font-display text-[24px] uppercase leading-[28px] text-ink">
                    {frase}
                  </Text>
                  <Text className="mt-1 text-center font-body text-[13px] text-muted">
                    {ganhou ? `+${ganhou} gomo${ganhou > 1 ? "s" : ""} no seu anel · ` : ""}
                    <Counter value={g.gomos} from={antes ?? 0} delay={d(T_ANEL)} duration={1100} />
                    {" de 48"}
                    {g.nivel > 0 ? ` · ${NIVEIS[g.nivel]}` : ""}
                  </Text>
                </FadeUp>
              ) : (
                <FadeUp delay={d(T_TEXTO)} style={{ alignItems: "center" }}>
                  <Text className="mt-2 font-display text-[32px] uppercase text-ink">
                    {ganhou ? `+${ganhou} gomo${ganhou > 1 ? "s" : ""}` : "Avaliação enviada"}
                  </Text>
                  <Text className="font-body text-[14px] text-muted">
                    {"Já está no mapa. "}
                    <Counter value={g.gomos} from={antes ?? 0} delay={d(T_ANEL)} duration={1100} />
                    {" de 48"}
                    {g.nivel > 0 ? ` · ${NIVEIS[g.nivel]}` : ""}.
                  </Text>
                </FadeUp>
              )}
            </View>
            {!ganhou && semanaCheia && (
              <FadeUp delay={d(T_TEXTO + 120)}>
                <Text className="mt-1 text-center font-body text-[13px] text-dim">
                  Os gomos desta semana já acenderam. Segunda tem mais.
                </Text>
              </FadeUp>
            )}
            <View className="mt-4 w-full flex-row gap-2">
              <FadeUp delay={d(T_CARTOES)} style={{ flex: 1 }}>
                <View className="flex-1 items-center rounded-2xl bg-subtle px-2 py-3">
                  <Counter
                    value={g.faiscas.rumo}
                    delay={d(T_CARTOES + 120)}
                    duration={700}
                    className="font-display text-[22px] text-ink"
                  />
                  <Text className="text-center font-body text-[11.5px] text-muted">
                    faíscas de 10
                  </Text>
                </View>
              </FadeUp>
              <FadeUp delay={d(T_CARTOES + 90)} style={{ flex: 1 }}>
                <View className="flex-1 items-center rounded-2xl bg-subtle px-2 py-3">
                  <Text className="font-display text-[22px] text-ink">+1</Text>
                  <Text className="text-center font-body text-[11.5px] text-muted">
                    cor no mapa
                  </Text>
                </View>
              </FadeUp>
              {quase && qm && (
                <FadeUp delay={d(T_CARTOES + 180)} style={{ flex: 1 }}>
                  <View className="flex-1 items-center rounded-2xl bg-subtle px-2 py-3">
                    <Text className="font-display text-[22px] text-ink">
                      <Counter value={quase.valor} delay={d(T_CARTOES + 300)} duration={700} />/
                      {quase.alvo}
                    </Text>
                    <Text
                      className="text-center font-body text-[11.5px] text-muted"
                      numberOfLines={1}
                    >
                      {nomeDa(qm, g.forma)}
                    </Text>
                  </View>
                </FadeUp>
              )}
            </View>
            {quase && qm && (
              <FadeUp delay={d(T_CARTOES + 280)} style={{ alignSelf: "stretch" }}>
                <View
                  className="mt-3 flex-row items-center gap-3 rounded-2xl bg-surface px-3 py-2"
                  style={shadow.card}
                >
                  <AnimatedMedal
                    id={quase.id}
                    size={44}
                    on={false}
                    prog={quase.valor / quase.alvo}
                    lockIcon={false}
                    delay={T_CARTOES + 400}
                    duration={900}
                  />
                  <Text className="flex-1 font-body text-[13px] text-muted">
                    Faltam {quase.alvo - quase.valor} para {nomeDa(qm, g.forma)}.
                  </Text>
                </View>
              </FadeUp>
            )}
          </>
        ) : (
          <FadeUp delay={d(120)} style={{ alignItems: "center", gap: 8, paddingVertical: 32 }}>
            <Text
              className={`text-center font-display uppercase text-ink ${frase ? "text-[24px] leading-[28px]" : "text-[28px]"}`}
            >
              {frase ?? (isFetching ? "Enviando…" : "Avaliação registrada")}
            </Text>
            <Text className="font-body text-[14px] text-muted">
              Obrigado por ajudar a comunidade.
            </Text>
          </FadeUp>
        )}
        <Pressable
          onPress={onClose}
          className="mt-5 w-full items-center rounded-full py-3.5 active:opacity-80"
          style={{ backgroundColor: colors.night }}
        >
          <Text className="font-body-bold text-[15px] text-paper">Continuar</Text>
        </Pressable>
      </FadeUp>
    </Modal>
  );
}
