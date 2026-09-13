import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Text, View } from "react-native";

import { ReportButton } from "@/components/ReportButton";
import type { PublicOccurrence } from "@/lib/types";
import { OCCURRENCE_TYPES, SEVERITIES } from "@/theme/domain";

export function formatOccurrenceDate(iso: string) {
  return format(parseISO(iso), "d 'de' MMM 'de' yyyy", { locale: ptBR });
}

export function OccurrenceCard({ occurrence: o }: { occurrence: PublicOccurrence }) {
  const type = OCCURRENCE_TYPES[o.type];
  const sev = SEVERITIES[o.severity];
  return (
    <View className="gap-2 rounded-xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: type.color }}>
          <Text className="font-body-bold text-xs uppercase tracking-wider text-night">
            {type.label}
          </Text>
        </View>
        <Text className="font-body-medium text-xs" style={{ color: sev.color }}>
          Gravidade {sev.label.toLowerCase()}
        </Text>
      </View>
      <Text className="font-heading text-base uppercase tracking-wide text-ink">
        {o.neighborhood ?? o.city} · <Text className="text-dim">anônimo</Text>
      </Text>
      {!!o.description && (
        <Text className="font-body text-sm text-muted" numberOfLines={3}>
          {o.description}
        </Text>
      )}
      <View className="flex-row items-center justify-between">
        <Text className="font-body text-xs text-dim">
          {formatOccurrenceDate(o.occurrence_date)}
          {o.is_obfuscated ? " · posição aproximada" : ""}
        </Text>
        <ReportButton type="occurrence" id={o.id} compact />
      </View>
    </View>
  );
}
