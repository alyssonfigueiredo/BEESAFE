import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { MedalView } from "@/components/gami/MedalView";
import { SliceRing } from "@/components/gami/Rings";
import { useGamification } from "@/hooks/useGamification";
import { LANCAMENTO, NIVEIS } from "@/lib/medals";
import { colors, shadow } from "@/theme/tokens";

// Acréscimos no Perfil: o anel (gomos) e as conquistas (medalhas), cada um no seu cartão.

/** O anel de 48 gomos: cada semana acende no máximo 4. */
export function AnelCard() {
  const { data: g } = useGamification();
  if (!g) return null;
  const max = g.gomos_semana_max ?? 4;
  const semana = g.gomos_semana ?? null;
  return (
    <View
      className="flex-row items-center gap-4 rounded-[30px] bg-surface px-5 py-4"
      style={shadow.card}
    >
      <SliceRing lit={g.gomos} size={78} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
          Seu anel
        </Text>
        <Text className="font-display text-[24px] uppercase" style={{ color: colors.turquoiseInk }}>
          {NIVEIS[g.nivel]}
        </Text>
        <Text className="font-body text-[13px] text-muted">
          {g.gomos} de 48 gomos
          {semana != null ? ` · ${Math.min(semana, max)} de ${max} esta semana` : ""}
        </Text>
        <Text className="font-body text-[12px] leading-[16px] text-dim">
          {semana != null && semana >= max
            ? "Os gomos desta semana já acenderam. Segunda tem mais."
            : "Avaliar, acender o selo de um lugar, cadastrar lugar e foto aprovada acendem gomos."}
        </Text>
      </View>
    </View>
  );
}

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
        {mostrar.map((id) => {
          const p = g.medalhas.find((x) => x.id === id);
          return (
            <MedalView
              key={id}
              id={id}
              size={46}
              on={feitas.has(id)}
              prog={p ? p.valor / p.alvo : 0}
              lockIcon={false}
            />
          );
        })}
      </View>
    </Pressable>
  );
}
