import { Link } from "expo-router";
import { X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Chip } from "@/components/Chip";
import { CityMap } from "@/components/CityMap";
import { DangerRanking } from "@/components/DangerRanking";
import { Glass } from "@/components/Glass";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { PlaceCard } from "@/components/PlaceCard";
import { useAreaRisk, useOccurrences } from "@/hooks/useOccurrences";
import { usePlaces } from "@/hooks/usePlaces";
import { tabBarBottom, useScreenInsets } from "@/hooks/useScreenInsets";
import { distanceMeters } from "@/lib/geo";
import type { PublicOccurrence, PublicPlace } from "@/lib/types";
import { useCity } from "@/providers/CityProvider";
import { OCCURRENCE_TYPES, SEVERITIES, type OccurrenceType } from "@/theme/domain";
import { colors, glass, shadow } from "@/theme/tokens";

const TYPE_KEYS = Object.keys(OCCURRENCE_TYPES) as OccurrenceType[];

/**
 * Mapa em tela cheia: o mapa ocupa tudo, os chips de filtro flutuam em vidro logo abaixo do
 * cabeçalho e uma folha de vidro no pé guarda o ranking e a legenda. A folha abre e fecha pelo
 * puxador; fechada, mostra só o título e o botão Registrar.
 */
export default function MapaScreen() {
  const insets = useScreenInsets();
  const safe = useSafeAreaInsets();
  const { city, loading, userLocation } = useCity();
  const { data: occurrences = [], isLoading } = useOccurrences(city?.id);
  const { data: ranking = [] } = useAreaRisk(city?.id, 6);
  const { data: places = [] } = usePlaces(city?.id);
  const [layers, setLayers] = useState({ relatos: true, lugares: true });
  // Tocar num pino não abre a ficha direto: mostra um balão com o nome, e o balão é que abre.
  const [placeSel, setPlaceSel] = useState<PublicPlace | null>(null);
  // Mapa ou lista: a mesma cidade, os mesmos lugares, do jeito que a pessoa preferir olhar.
  const [modo, setModo] = useState<"mapa" | "lista">("mapa");
  const [filter, setFilter] = useState<OccurrenceType | "all">("all");
  const [selected, setSelected] = useState<PublicOccurrence | null>(null);
  const [aberta, setAberta] = useState(false);

  const filtered = useMemo(
    () => (filter === "all" ? occurrences : occurrences.filter((o) => o.type === filter)),
    [occurrences, filter],
  );
  const lista = useMemo(
    () =>
      places
        .map((p) => ({
          place: p,
          distance: userLocation
            ? distanceMeters(userLocation, { lat: p.latitude, lng: p.longitude })
            : null,
        }))
        .sort((a, b) =>
          a.distance != null && b.distance != null
            ? a.distance - b.distance
            : a.place.name.localeCompare(b.place.name, "pt-BR"),
        ),
    [places, userLocation],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of occurrences) c[o.type] = (c[o.type] ?? 0) + 1;
    return c;
  }, [occurrences]);

  if (loading || !city) {
    return (
      <View className="flex-1 items-center justify-center bg-paper px-6">
        <Text className="font-body text-base text-muted">
          {loading
            ? "Localizando sua cidade…"
            : "Nenhuma cidade encontrada. Verifique a permissão de localização."}
        </Text>
      </View>
    );
  }

  const bottom = glass.tabBarHeight + tabBarBottom(safe.bottom) + 8;

  return (
    <View className="flex-1 bg-paper">
      <CityMap
        key={city.id}
        occurrences={layers.relatos ? filtered : []}
        places={layers.lugares ? places : []}
        onSelectPlace={(p) => {
          setSelected(null);
          setPlaceSel(p);
        }}
        center={{ lat: city.lat, lng: city.lng }}
        onSelect={(o) => {
          setPlaceSel(null);
          setSelected(o);
        }}
        onPressEmpty={() => {
          setPlaceSel(null);
          setSelected(null);
        }}
        style={[StyleSheet.absoluteFill, { borderRadius: 0 }]}
      />

      {modo === "lista" && (
        <View style={StyleSheet.absoluteFill} className="bg-paper">
          <FlatList
            data={lista}
            keyExtractor={(i) => i.place.id}
            contentContainerClassName="gap-3 px-4"
            contentContainerStyle={{
              paddingTop: insets.paddingTop + 96,
              paddingBottom: insets.paddingBottom,
            }}
            renderItem={({ item, index }) => (
              <PlaceCard place={item.place} distance={item.distance} index={index} />
            )}
            ListEmptyComponent={
              <Text className="font-body text-sm text-dim">Nenhum lugar cadastrado ainda.</Text>
            }
          />
        </View>
      )}

      {/* Chips flutuando por cima do mapa, abaixo do cabeçalho de vidro. */}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 gap-2"
        style={{ top: insets.paddingTop - 8 }}
      >
        <View className="flex-row gap-2 px-4">
          <Chip label="Mapa" glass active={modo === "mapa"} onPress={() => setModo("mapa")} />
          <Chip label="Lista" glass active={modo === "lista"} onPress={() => setModo("lista")} />
        </View>
        {modo === "mapa" && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2 px-4"
            >
              <Chip
                label={`Todos (${occurrences.length})`}
                glass
                active={filter === "all"}
                onPress={() => setFilter("all")}
              />
              {TYPE_KEYS.map((k) => (
                <Chip
                  key={k}
                  label={`${OCCURRENCE_TYPES[k].label} (${counts[k] ?? 0})`}
                  color={OCCURRENCE_TYPES[k].color}
                  glass
                  active={filter === k}
                  onPress={() => setFilter(k)}
                />
              ))}
            </ScrollView>
            <View className="flex-row gap-2 px-4">
              <Chip
                label={`Relatos (${occurrences.length})`}
                color={colors.coral}
                glass
                active={layers.relatos}
                onPress={() => setLayers((l) => ({ ...l, relatos: !l.relatos }))}
              />
              <Chip
                label={`Lugares (${places.length})`}
                color={colors.turquoise}
                glass
                active={layers.lugares}
                onPress={() => setLayers((l) => ({ ...l, lugares: !l.lugares }))}
              />
            </View>
          </>
        )}
        {isLoading && <Text className="px-4 font-body text-xs text-dim">Carregando relatos…</Text>}
      </View>

      {/* Lugar tocado: balão com o cartão; o toque no cartão abre a ficha. */}
      {modo === "mapa" && placeSel && (
        <View
          pointerEvents="box-none"
          className="absolute left-4 right-4"
          style={{ top: insets.paddingTop + 130 }}
        >
          <Glass tint="strong" style={[{ borderRadius: 26, padding: 4 }, shadow.lift]}>
            <PlaceCard place={placeSel} />
            <Pressable
              onPress={() => setPlaceSel(null)}
              hitSlop={10}
              className="absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(20,24,41,0.08)" }}
            >
              <X color={colors.muted} size={14} />
            </Pressable>
          </Glass>
        </View>
      )}

      {/* Relato tocado: balão de vidro no meio da tela. */}
      {modo === "mapa" && selected && (
        <View
          pointerEvents="box-none"
          className="absolute left-4 right-4"
          style={{ top: insets.paddingTop + 130 }}
        >
          <Glass tint="strong" style={[{ borderRadius: 24, padding: 4 }, shadow.lift]}>
            <OccurrenceCard occurrence={selected} />
            <Pressable
              onPress={() => setSelected(null)}
              hitSlop={10}
              className="absolute right-3 top-3 h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(20,24,41,0.08)" }}
            >
              <X color={colors.muted} size={14} />
            </Pressable>
          </Glass>
        </View>
      )}

      {/* Folha de vidro no pé: título, Registrar e, aberta, ranking e legenda. */}
      {modo === "mapa" && (
        <View className="absolute left-4 right-4" style={{ bottom, maxHeight: "48%" }}>
          <Glass
            style={[{ borderRadius: 28, paddingHorizontal: 16, paddingBottom: 14 }, shadow.lift]}
          >
            <Pressable onPress={() => setAberta((a) => !a)} className="items-center py-2">
              <View
                className="h-1.5 w-10 rounded-full"
                style={{ backgroundColor: "rgba(20,24,41,0.22)" }}
              />
            </Pressable>
            <View className="flex-row items-center justify-between gap-2">
              <Pressable onPress={() => setAberta((a) => !a)} className="flex-1">
                <Text className="font-display text-2xl uppercase tracking-wide text-ink">Mapa</Text>
                <Text className="font-body text-xs text-dim">
                  {city.name} · {city.state} · {occurrences.length} relatos
                </Text>
              </Pressable>
              <Link href="/registrar" asChild>
                <Pressable
                  className="rounded-full bg-coral px-4 py-2.5 active:opacity-80"
                  style={shadow.coral}
                >
                  <Text className="font-body-bold text-sm text-night">Registrar</Text>
                </Pressable>
              </Link>
            </View>
            {aberta && (
              <ScrollView
                className="mt-3"
                contentContainerClassName="gap-3"
                showsVerticalScrollIndicator={false}
              >
                <DangerRanking items={ranking} />
                <View className="gap-2 rounded-3xl bg-surface p-4">
                  <Text className="font-body-bold text-base text-ink">Legenda</Text>
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
            )}
          </Glass>
        </View>
      )}
    </View>
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
