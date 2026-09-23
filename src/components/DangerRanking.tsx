import { Link } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import type { AreaRisk } from "@/lib/types";
import { riskLevel } from "@/theme/domain";
import { colors } from "@/theme/tokens";

export function DangerRanking({
  items,
  title = "Áreas de atenção",
}: {
  items: AreaRisk[];
  title?: string;
}) {
  return (
    <View className="gap-3 rounded-xl border border-border bg-surface p-4">
      <Text className="font-heading text-base uppercase tracking-widest text-ink">{title}</Text>
      {items.length === 0 && (
        <Text className="font-body text-sm text-dim">
          Sem relatos com bairro nos últimos 12 meses.
        </Text>
      )}
      {items.map((a, i) => {
        const level = riskLevel(Number(a.score));
        return (
          /* Toque abre a ficha do bairro: é lá que os relatos da área e os lugares dela aparecem
             na mesma tela, que é onde a tese do app se prova. */
          <Link
            key={a.neighborhood_id}
            href={{ pathname: "/bairro/[id]", params: { id: String(a.neighborhood_id) } }}
            asChild
          >
            <Pressable className="flex-row items-center gap-3 active:opacity-70">
              <Text className="w-6 font-display text-lg text-dim">{i + 1}</Text>
              <View className="flex-1">
                <Text className="font-body-medium text-sm text-ink">{a.neighborhood}</Text>
                <Text className="font-body text-xs text-dim">
                  {a.total} relato{Number(a.total) === 1 ? "" : "s"} · {a.high} grave
                  {Number(a.high) === 1 ? "" : "s"}
                </Text>
              </View>
              <Text className="font-body-bold text-xs" style={{ color: level.color }}>
                {level.label}
              </Text>
              <ChevronRight color={colors.dim} size={16} />
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}
