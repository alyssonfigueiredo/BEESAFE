import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { PlacePhoto } from "@/components/PlacePhoto";
import { Rainbow } from "@/components/Rainbow";
import { formatOccurrenceDate } from "@/components/OccurrenceCard";
import { formatDistance } from "@/lib/geo";
import type { PublicOccurrence, PublicPlace } from "@/lib/types";
import {
  DAY_PERIODS,
  OCCURRENCE_SETTINGS,
  OCCURRENCE_TYPES,
  PLACE_CATEGORIES,
  onLight,
} from "@/theme/domain";
import { colors } from "@/theme/tokens";

export const CARD_W = 236;
export const CARD_GAP = 10;

const cardStyle = {
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "rgba(20,24,41,0.07)",
  borderRadius: 18,
  padding: 10,
  boxShadow: "0 1px 2px rgba(20,24,41,0.06), 0 4px 12px rgba(20,24,41,0.06)",
} as const;

/** Cartão compacto de lugar: azulejo, nome, marcador de cinco faixas, categoria e distância. */
export function NearPlaceCard({
  place,
  distance,
  onPress,
  full,
}: {
  place: PublicPlace;
  distance: number | null;
  onPress: () => void;
  /** Largura toda (modo Lista) em vez da largura fixa do carrossel. */
  full?: boolean;
}) {
  const score = place.score == null ? null : Number(place.score);
  const meta = [
    PLACE_CATEGORIES[place.category],
    distance != null ? formatDistance(distance) : place.neighborhood,
    score == null ? "ainda sem nota" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}, ${meta}`}
      className="flex-row items-center active:opacity-80"
      style={[cardStyle, { gap: 10 }, full ? null : { width: CARD_W }]}
    >
      <PlacePhoto
        category={place.category}
        photoName={place.photo_name}
        photoUrl={place.photo_url}
        photoCredit={place.photo_credit}
        photoCreditUri={place.photo_credit_uri}
        photoAuthor={place.photo_author}
        photoAuthorUri={place.photo_author_uri}
        size={48}
        muted={score == null}
      />
      <View className="min-w-0 flex-1" style={{ gap: 4 }}>
        <Text className="font-body-bold text-sm text-ink" numberOfLines={1}>
          {place.name}
        </Text>
        {score != null && <Rainbow value={score} size={5} />}
        <Text className="font-body text-[11.5px] text-dim" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

/** Cartão "Ver ficha" ao lado do lugar tocado no mapa. */
export function OpenCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      className="flex-row items-center justify-center active:opacity-80"
      style={[cardStyle, { width: 120, gap: 4 }]}
    >
      <Text className="font-body-bold text-sm text-ink">Ver ficha</Text>
      <ChevronRight color={colors.ink} size={16} strokeWidth={2.4} />
    </Pressable>
  );
}

/** Relato dentro de uma área tocada: tipo, onde/quando e data. Sem autor, sempre. */
export function RelatoMiniCard({ occurrence: o }: { occurrence: PublicOccurrence }) {
  const type = OCCURRENCE_TYPES[o.type];
  const extra = [
    o.setting && OCCURRENCE_SETTINGS[o.setting].label,
    o.period && DAY_PERIODS[o.period].label,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <View style={[cardStyle, { width: CARD_W, gap: 6 }]}>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: type.color }} />
        <Text
          className="font-body-bold text-xs"
          style={{ color: onLight(type.color) }}
          numberOfLines={1}
        >
          {type.label}
        </Text>
      </View>
      <Text className="font-body-medium text-[13px] text-ink" numberOfLines={1}>
        {o.neighborhood ?? o.city} · <Text className="text-dim">anônimo</Text>
      </Text>
      <Text className="font-body text-[11.5px] text-dim" numberOfLines={1}>
        {[extra, formatOccurrenceDate(o.occurrence_date)].filter(Boolean).join(" · ")}
      </Text>
    </View>
  );
}
