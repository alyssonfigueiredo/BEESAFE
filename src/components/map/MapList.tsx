import { AlertTriangle } from "lucide-react-native";
import type { ReactNode } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { DangerRanking } from "@/components/DangerRanking";
import { formatDistance } from "@/lib/geo";
import type { AreaRisk, PublicPlace } from "@/lib/types";
import { colors } from "@/theme/tokens";

import { plural, type RelatoArea } from "./mapData";
import { NearPlaceCard } from "./NearCards";

export type ListItem = { place: PublicPlace; distance: number | null };

const enter = (i: number) =>
  FadeInDown.duration(360)
    .delay(Math.min(i, 8) * 60)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });

type Props = {
  items: ListItem[];
  /** Área de relato mais perto de quem usa (só com localização e até 2 km). */
  nearestArea: { area: RelatoArea; distance: number } | null;
  ranking: AreaRisk[];
  showPlaces: boolean;
  showRelatos: boolean;
  nearMode: boolean;
  loading: boolean;
  paddingTop: number;
  paddingBottom: number;
  onOpenPlace: (p: PublicPlace) => void;
  onOpenArea: (a: RelatoArea) => void;
};

/** Modo Lista: o mesmo pedaço da cidade, em lista por distância. */
export function MapList({
  items,
  nearestArea,
  ranking,
  showPlaces,
  showRelatos,
  nearMode,
  loading,
  paddingTop,
  paddingBottom,
  onOpenPlace,
  onOpenArea,
}: Props) {
  const header: ReactNode[] = [];
  if (showRelatos && nearestArea) {
    const { area, distance } = nearestArea;
    const quando =
      area.recent30 > 0
        ? `${plural(area.recent30, "relato", "relatos")} nos últimos 30 dias`
        : plural(area.occurrences.length, "relato registrado", "relatos registrados");
    header.push(
      <Pressable
        key="area"
        onPress={() => onOpenArea(area)}
        accessibilityRole="button"
        className="flex-row items-center active:opacity-80"
        style={{
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 20,
          backgroundColor: "rgba(255,105,100,0.12)",
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderColor: "rgba(199,40,37,0.35)",
        }}
      >
        <View
          className="items-center justify-center"
          style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: "#FFFFFF" }}
        >
          <AlertTriangle color={colors.coralInk} size={18} strokeWidth={2.2} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-body-bold text-sm text-coralInk">
            Área de atenção a {formatDistance(distance)}
          </Text>
          <Text className="font-body text-xs text-muted" numberOfLines={2}>
            {[quando, area.neighborhood].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </Pressable>,
    );
  }
  if (showPlaces) {
    header.push(
      <Text key="sec" className="mt-1 font-body-bold text-xs uppercase tracking-[1.7px] text-dim">
        {nearMode ? "Lugares perto de você" : "Lugares da cidade"}
      </Text>,
    );
  }

  return (
    <FlatList
      data={showPlaces ? items : []}
      keyExtractor={(i) => i.place.id}
      contentContainerStyle={{ paddingHorizontal: 14, gap: 10, paddingTop, paddingBottom }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        header.length > 0 ? (
          <View style={{ gap: 10 }}>
            {header.map((h, i) => (
              <Animated.View key={i} entering={enter(i)}>
                {h}
              </Animated.View>
            ))}
          </View>
        ) : null
      }
      renderItem={({ item, index }) => (
        <Animated.View entering={enter(index + header.length)}>
          <NearPlaceCard
            place={item.place}
            distance={item.distance}
            full
            onPress={() => onOpenPlace(item.place)}
          />
        </Animated.View>
      )}
      ListEmptyComponent={
        showPlaces ? (
          <Text className="font-body text-sm text-dim">
            {loading ? "Carregando lugares…" : "Nenhum lugar por aqui ainda."}
          </Text>
        ) : null
      }
      ListFooterComponent={
        showRelatos ? (
          <View style={{ marginTop: 6, gap: 10 }}>
            <DangerRanking items={ranking} title="Bairros com mais relatos" />
            <Text className="px-1 font-body text-[12.5px] leading-5 text-dim">
              Sem relato não quer dizer área segura: quer dizer que ninguém registrou ainda.
            </Text>
          </View>
        ) : null
      }
    />
  );
}
