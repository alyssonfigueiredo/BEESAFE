import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CityMap } from "@/components/CityMap";
import { DangerRanking } from "@/components/DangerRanking";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { useAreaRisk, useOccurrences } from "@/hooks/useOccurrences";
import { usePlaces } from "@/hooks/usePlaces";
import type { PublicOccurrence } from "@/lib/types";
import { useCity } from "@/providers/CityProvider";
import { OCCURRENCE_TYPES, SEVERITIES, type OccurrenceType } from "@/theme/domain";
import { colors } from "@/theme/tokens";

const TYPE_KEYS = Object.keys(OCCURRENCE_TYPES) as OccurrenceType[];

export default function MapaScreen() {
  const { city, loading } = useCity();
  const { data: occurrences = [], isLoading } = useOccurrences(city?.id);
  const { data: ranking = [] } = useAreaRisk(city?.id, 6);
  const { data: places = [] } = usePlaces(city?.id);
  const router = useRouter();
  const [layers, setLayers] = useState({ relatos: true, lugares: true });
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

      <View className="flex-row gap-2">
        <Chip
          label={`Relatos (${occurrences.length})`}
          color={colors.coral}
          active={layers.relatos}
          onPress={() => setLayers((l) => ({ ...l, relatos: !l.relatos }))}
        />
        <Chip
          label={`Lugares (${places.length})`}
          color={colors.turquoise}
          active={layers.lugares}
          onPress={() => setLayers((l) => ({ ...l, lugares: !l.lugares }))}
        />
      </View>

      <CityMap
        occurrences={layers.relatos ? filtered : []}
        places={layers.lugares ? places : []}
        onSelectPlace={(p) => router.push({ pathname: "/lugar/[id]", params: { id: p.id } })}
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
          <LegendItem color={colors.turquoise} label="Lugar 4,5+" />
          <LegendItem color={colors.yellow} label="Lugar 3,5+" />
          <LegendItem color={colors.coral} label="Lugar abaixo de 2,5" />
          <LegendItem color={colors.dim} label="Sem avaliação" />
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
