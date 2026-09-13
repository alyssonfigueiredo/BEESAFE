import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CityMap } from "@/components/CityMap";
import { DangerRanking } from "@/components/DangerRanking";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { useAreaRisk, useOccurrences } from "@/hooks/useOccurrences";
import type { PublicOccurrence } from "@/lib/types";
import { useCity } from "@/providers/CityProvider";
import { OCCURRENCE_TYPES, SEVERITIES, type OccurrenceType } from "@/theme/domain";
import { colors } from "@/theme/tokens";

const TYPE_KEYS = Object.keys(OCCURRENCE_TYPES) as OccurrenceType[];

export default function MapaScreen() {
  const { city, loading } = useCity();
  const { data: occurrences = [], isLoading } = useOccurrences(city?.id);
  const { data: ranking = [] } = useAreaRisk(city?.id, 6);
  const [filter, setFilter] = useState<OccurrenceType | "all">("all");
  const [selected, setSelected] = useState<PublicOccurrence | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? occurrences : occurrences.filter((o) => o.type === filter)),
    [occurrences, filter],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of occurrences) c[o.type] = (c[o.type] ?? 0) + 1;
    return c;
  }, [occurrences]);

  if (loading || !city) {
    return (
      <View className="flex-1 items-center justify-center bg-night px-6">
        <Text className="font-body text-base text-muted">
          {loading
            ? "Localizando sua cidade…"
            : "Nenhuma cidade encontrada. Verifique a permissão de localização."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-night" contentContainerClassName="gap-4 px-4 py-4">
      <View className="flex-row items-end justify-between">
        <View>
          <Text className="font-display text-3xl uppercase tracking-widest text-ink">Mapa</Text>
          <Text className="font-body text-sm text-dim">
            {city.name} · {city.state} · {occurrences.length} relatos
          </Text>
        </View>
        <Link href="/registrar" asChild>
          <Pressable className="rounded-xl bg-coral px-4 py-2 active:opacity-80">
            <Text className="font-heading text-sm uppercase tracking-widest text-night">
              Registrar
            </Text>
          </Pressable>
        </Link>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        <Chip
          label={`Todos (${occurrences.length})`}
          color={colors.muted}
          active={filter === "all"}
          onPress={() => setFilter("all")}
        />
        {TYPE_KEYS.map((k) => (
          <Chip
            key={k}
            label={`${OCCURRENCE_TYPES[k].label} (${counts[k] ?? 0})`}
            color={OCCURRENCE_TYPES[k].color}
            active={filter === k}
            onPress={() => setFilter(k)}
          />
        ))}
      </ScrollView>

      <CityMap
        occurrences={filtered}
        center={{ lat: city.lat, lng: city.lng }}
        onSelect={setSelected}
        style={{ height: 420 }}
      />
      {isLoading && <Text className="font-body text-xs text-dim">Carregando relatos…</Text>}

      {selected && <OccurrenceCard occurrence={selected} />}

      <DangerRanking items={ranking} />

      <View className="gap-2 rounded-xl border border-border bg-surface p-4">
        <Text className="font-heading text-base uppercase tracking-widest text-ink">Legenda</Text>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          {Object.values(SEVERITIES).map((s) => (
            <LegendItem
              key={s.label}
              color={s.color}
              label={`Gravidade ${s.label.toLowerCase()}`}
            />
          ))}
        </View>
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          <LegendItem color={colors.yellow} label="1–2 relatos" faded />
          <LegendItem color={colors.orange} label="3–4 relatos" faded />
          <LegendItem color={colors.coral} label="5+ relatos" faded />
        </View>
      </View>
    </ScrollView>
  );
}

function Chip({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full border px-3 py-1.5"
      style={{ borderColor: color, backgroundColor: active ? color : "transparent" }}
    >
      <Text className="font-body-medium text-xs" style={{ color: active ? colors.night : color }}>
        {label}
      </Text>
    </Pressable>
  );
}

function LegendItem({ color, label, faded }: { color: string; label: string; faded?: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: color,
          opacity: faded ? 0.4 : 1,
        }}
      />
      <Text className="font-body text-xs text-muted">{label}</Text>
    </View>
  );
}
