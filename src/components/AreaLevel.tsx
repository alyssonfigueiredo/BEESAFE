import { AlertTriangle } from "lucide-react-native";
import { Text, View } from "react-native";

import { colors } from "@/theme/tokens";

/** Nível de atenção da REGIÃO em volta. Nunca é nota do lugar: o bar recebe cor, a rua recebe aviso. */
export type AreaLevelKey = "atencao" | "alerta";

const NIVEIS: Record<AreaLevelKey, { curto: string; longo: string; cor: string; ink: string }> = {
  atencao: {
    curto: "Região com relato",
    longo: "Houve relato de LGBTIfobia nesta região nos últimos 6 meses.",
    cor: colors.yellow,
    ink: colors.yellowInk,
  },
  alerta: {
    curto: "Região com vários relatos",
    longo: "Esta região concentra relatos de LGBTIfobia nos últimos 6 meses.",
    cor: colors.coral,
    ink: colors.coralInk,
  },
};

export function AreaLevel({ level, size = "sm" }: { level: AreaLevelKey; size?: "sm" | "lg" }) {
  const n = NIVEIS[level];
  const lg = size === "lg";

  if (!lg) {
    return (
      <View
        className="flex-row items-center gap-1.5 self-start rounded-lg px-2 py-1"
        style={{ backgroundColor: n.cor + "2E" }}
      >
        <AlertTriangle color={n.ink} size={13} />
        <Text className="font-body-medium text-xs" style={{ color: n.ink }}>
          {n.curto}
        </Text>
      </View>
    );
  }

  // Na ficha o aviso precisa dizer de quem ele é — senão vira acusação ao estabelecimento.
  return (
    <View
      className="mt-1 gap-1 rounded-xl p-3"
      style={{ backgroundColor: n.cor + "1F", borderColor: n.cor + "99", borderWidth: 1 }}
    >
      <View className="flex-row items-center gap-2">
        <AlertTriangle color={n.ink} size={18} />
        <Text className="font-heading text-sm uppercase tracking-widest" style={{ color: n.ink }}>
          Atenção na região
        </Text>
      </View>
      <Text className="font-body text-sm text-muted">{n.longo}</Text>
      <Text className="font-body text-xs text-dim">
        É sobre a rua em volta, num raio de 100 m — não sobre este lugar, e não afeta a nota dele.
      </Text>
    </View>
  );
}
