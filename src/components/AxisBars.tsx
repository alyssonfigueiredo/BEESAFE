import { Text, View } from "react-native";

import { Rainbow } from "@/components/Rainbow";
import { AXES, AXIS_KEYS, SCALE, type Axis } from "@/theme/domain";
import { colors } from "@/theme/tokens";

export type AxisScores = Partial<Record<Axis, number | null>>;

/** Os quatro eixos do acolhimento: nome, marcador e nota. */
export function AxisBars({ scores, size = 8 }: { scores: AxisScores; size?: number }) {
  const shown = AXIS_KEYS.filter((k) => scores[k] != null);
  if (shown.length === 0) return null;
  return (
    <View className="gap-1.5">
      {shown.map((k) => (
        <View key={k} className="flex-row items-center gap-2">
          <Text className="w-20 font-body text-xs text-muted">{AXES[k].label}</Text>
          <Rainbow value={Number(scores[k])} size={size} />
          <Text className="flex-1 text-right font-body-medium text-xs text-ink">
            {Number(scores[k]).toFixed(1)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Versão compacta para o card da lista: um traço por eixo, na ordem do anel.
 *  Não cabem cinco faixas por eixo numa linha de card — aqui o valor é a largura preenchida. */
export function AxisStrip({ scores }: { scores: AxisScores }) {
  const shown = AXIS_KEYS.filter((k) => scores[k] != null);
  if (shown.length < AXIS_KEYS.length) return null;
  return (
    <View className="flex-row gap-1.5">
      {shown.map((k, i) => (
        <View
          key={k}
          className="h-1 flex-1 overflow-hidden rounded-sm"
          style={{ backgroundColor: colors.border }}
          accessibilityLabel={`${AXES[k].label} ${Number(scores[k]).toFixed(1)} de 5`}
        >
          <View
            className="h-full rounded-sm"
            style={{
              width: `${Math.max(6, (Number(scores[k]) / 5) * 100)}%`,
              backgroundColor: SCALE[i],
            }}
          />
        </View>
      ))}
    </View>
  );
}
