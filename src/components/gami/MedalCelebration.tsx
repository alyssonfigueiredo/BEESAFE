import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { FadeUp } from "@/components/gami/Anim";
import { AnimatedMedal } from "@/components/gami/MedalView";
import { useGamification, useMarkSeen, useRewardOpen } from "@/hooks/useGamification";
import { getMedalha, nomeDa } from "@/lib/medals";
import { colors } from "@/theme/tokens";
import { useFolhaAberta } from "@/hooks/useDiscovery";

// Calmo e uma vez só: o rótulo aparece, o anel arco-íris da medalha se desenha até fechar, a cor
// da medalha surge por cima e só então o nome e a frase aparecem. Sem confete, sem brilho em
// loop, sem medalha pulsando.
const ATRASO = 300; // o anel começa depois que a tela escureceu
const ANEL = 1200; // o anel desenha em 1,2 s (AnimatedMedal), depois a cor aparece
const T_NOME = ATRASO + ANEL - 200;

/**
 * Medalha nova, em tela cheia. Fica no layout raiz e aparece sozinha quando o banco desbloqueia
 * alguma medalha que a pessoa ainda não viu; espera a folha da avaliação fechar.
 */
export function MedalCelebration() {
  const { data: g } = useGamification();
  const rewardOpen = useRewardOpen();
  const marcar = useMarkSeen();
  const reduce = useReducedMotion();
  const [aberta, setAberta] = useState<string[] | null>(null);

  const novas = useMemo(
    () => (g?.conquistadas ?? []).filter((c) => !c.visto && getMedalha(c.id)).map((c) => c.id),
    [g],
  );

  useEffect(() => {
    if (aberta || rewardOpen || novas.length === 0) return;
    const t = setTimeout(() => setAberta(novas), 600);
    return () => clearTimeout(t);
  }, [novas, aberta, rewardOpen]);

  function fechar(irConquistas: boolean) {
    if (aberta) marcar.mutate(aberta);
    setAberta(null);
    if (irConquistas) router.push("/conquistas");
  }

  const id = aberta?.[0];
  const m = id ? getMedalha(id) : null;
  useFolhaAberta(!!m);
  const banho = g?.conquistadas.find((c) => c.id === id)?.banho ?? null;
  const resto = (aberta?.length ?? 1) - 1;

  return (
    <Modal
      visible={!!m}
      transparent
      animationType="fade"
      onRequestClose={() => fechar(false)}
      statusBarTranslucent
    >
      {m && (
        <View className="flex-1 items-center px-7 pt-24" style={{ backgroundColor: colors.night }}>
          <FadeUp key={`d-${m.id}`} duration={400}>
            <Text
              className="font-body-medium text-[12px] uppercase tracking-wider"
              style={{ color: colors.turquoise }}
            >
              Desbloqueada
            </Text>
          </FadeUp>
          <View style={{ marginTop: 22 }}>
            <AnimatedMedal
              key={m.id}
              id={m.id}
              size={228}
              banho={banho}
              reveal
              delay={ATRASO}
              duration={ANEL}
            />
          </View>
          <FadeUp key={`n-${m.id}`} delay={reduce ? 0 : T_NOME} duration={450}>
            <Text className="mt-6 text-center font-display text-[42px] uppercase leading-[46px] text-paper">
              {nomeDa(m, g?.forma ?? 2)}
            </Text>
          </FadeUp>
          <FadeUp key={`c-${m.id}`} delay={reduce ? 0 : T_NOME + 180} duration={450}>
            <Text
              className="mt-3 text-center font-body text-[16px] leading-[23px]"
              style={{ color: "#C9CDE0" }}
            >
              “{m.copy}”
            </Text>
          </FadeUp>
          {resto > 0 && (
            <FadeUp key={`r-${m.id}`} delay={reduce ? 0 : T_NOME + 360} duration={450}>
              <Text className="mt-3 text-center font-body text-[13px]" style={{ color: "#8A90AA" }}>
                E mais {resto} nas suas conquistas.
              </Text>
            </FadeUp>
          )}
          <View className="absolute bottom-12 left-6 right-6 gap-2">
            <Pressable
              onPress={() => fechar(true)}
              className="items-center rounded-full bg-paper py-3.5 active:opacity-80"
            >
              <Text className="font-body-bold text-[15px] text-night">Ver conquistas</Text>
            </Pressable>
            <Pressable
              onPress={() => fechar(false)}
              className="items-center py-3 active:opacity-70"
            >
              <Text className="font-body-bold text-[15px] text-paper">Fechar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </Modal>
  );
}
