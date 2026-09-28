import { Link } from "expo-router";
import { BadgeCheck } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AreaLevel } from "@/components/AreaLevel";
import { AxisStrip } from "@/components/AxisBars";
import { Badge } from "@/components/Badge";
import { PlacePhoto } from "@/components/PlacePhoto";
import { Rainbow } from "@/components/Rainbow";
import { formatDistance } from "@/lib/geo";
import type { WelcomingPlace } from "@/lib/types";
import { PLACE_CATEGORIES, RATING_MIN, placeScoreColor } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

export function PlaceCard({
  place,
  verified,
  distance,
  index,
}: {
  place: WelcomingPlace;
  verified?: boolean;
  /** Metros até quem está olhando; sem localização, fica de fora. */
  distance?: number | null;
  /** Posição na lista: os cartões entram um atrás do outro. */
  index?: number;
}) {
  const onde = [place.neighborhood, distance != null ? formatDistance(distance) : null]
    .filter(Boolean)
    .join(" · ");
  const score = place.score == null ? null : Number(place.score);
  const axes = {
    welcome: place.score_welcome,
    affection: place.score_affection,
    restroom: place.score_restroom,
    crowd: place.score_crowd,
  };

  return (
    <Animated.View entering={FadeInDown.duration(450).delay(Math.min(index ?? 0, 9) * 55)}>
      <Link href={{ pathname: "/lugar/[id]", params: { id: place.id } }} asChild>
        <Pressable
          className="flex-row gap-3 rounded-3xl bg-surface p-3 active:opacity-80"
          style={shadow.card}
        >
          <PlacePhoto
            category={place.category}
            photoName={place.photo_name}
            photoUrl={place.photo_url}
            photoCredit={place.photo_credit}
            photoCreditUri={place.photo_credit_uri}
            photoAuthor={place.photo_author}
            photoAuthorUri={place.photo_author_uri}
            size={64}
            muted={score == null}
          />
          <View className="min-w-0 flex-1 gap-2">
            <View className="flex-row items-center justify-between gap-2">
              <View className="min-w-0 flex-1 flex-row items-center gap-1">
                <Text className="font-body-bold text-[15px] text-ink" numberOfLines={1}>
                  {place.name}
                </Text>
                {verified && <BadgeCheck color={colors.turquoiseInk} size={16} />}
              </View>
              <Text className="font-body text-xs text-dim">{PLACE_CATEGORIES[place.category]}</Text>
            </View>

            {score == null ? (
              <>
                <Text className="font-body text-sm text-muted">
                  Quanta cor tem esse lugar? Seja a primeira pessoa a dizer.
                </Text>
                {!!onde && <Text className="font-body text-xs text-dim">{onde}</Text>}
              </>
            ) : (
              <>
                <View className="flex-row items-center gap-2">
                  <Rainbow value={score} size={8} />
                  <Text
                    className="font-body-bold text-sm"
                    style={{ color: placeScoreColor(score) }}
                  >
                    {score.toFixed(1)}
                  </Text>
                  {place.badge && <Badge badge={place.badge} />}
                </View>
                <AxisStrip scores={axes} />
                <Text className="font-body text-xs text-dim">
                  {place.rating_count} avaliaç{place.rating_count === 1 ? "ão" : "ões"}
                  {place.rating_count < RATING_MIN ? ` de ${RATING_MIN} necessárias` : ""}
                  {onde ? ` · ${onde}` : ""}
                </Text>
              </>
            )}

            {/* O aviso é da região, não do lugar — e aparece também em lugar sem nota, que é o caso
              mais comum hoje. Sem relato não aparece nada: silêncio não é selo de segurança. */}
            {place.area_level && <AreaLevel level={place.area_level} />}
          </View>
        </Pressable>
      </Link>
    </Animated.View>
  );
}
