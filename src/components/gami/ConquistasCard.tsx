import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { AnimatedMedal } from "@/components/gami/MedalView";
import { useGamification } from "@/hooks/useGamification";
import { LANCAMENTO } from "@/lib/medals";
import { colors, shadow } from "@/theme/tokens";

// Acréscimos no Perfil: as conquistas (medalhas). A íris de gomos fica em Evolucao.tsx.

/** As medalhas, que abrem a tela com todas. */
export function ConquistasCard() {
  const { data: g } = useGamification();
  if (!g) return null;
  const feitas = new Set(g.conquistadas.map((c) => c.id));
  const on = LANCAMENTO.filter((id) => feitas.has(id));
  const lk = LANCAMENTO.filter((id) => !feitas.has(id));
  const mostrar = [...on.slice(0, 4), ...lk.slice(0, 6 - Math.min(4, on.length))].slice(0, 6);
  return (
    <Pressable
      onPress={() => router.push("/conquistas")}
      className="gap-3 rounded-[30px] bg-surface px-5 py-4 active:opacity-90"
      style={shadow.card}
    >
      <View className="flex-row items-baseline justify-between">
        <Text className="font-body-medium text-[17px] text-ink">Suas conquistas</Text>
        <Text className="font-body-bold text-[13px]" style={{ color: colors.turquoiseInk }}>
          {on.length} de {LANCAMENTO.length} · Ver todas
        </Text>
      </View>
      <View className="flex-row justify-between">
        {mostrar.map((id, i) => {
          const p = g.medalhas.find((x) => x.id === id);
          return (
            <AnimatedMedal
              key={id}
              id={id}
              size={46}
              on={feitas.has(id)}
              prog={p ? p.valor / p.alvo : 0}
              delay={400 + i * 80}
              duration={900}
            />
          );
        })}
      </View>
    </Pressable>
  );
}
