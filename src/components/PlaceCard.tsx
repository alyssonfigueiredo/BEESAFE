import { Link } from "expo-router";
import { AlertTriangle, BadgeCheck } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { Rainbow } from "@/components/Rainbow";
import type { WelcomingPlace } from "@/lib/types";
import { PLACE_CATEGORIES, placeScoreColor } from "@/theme/domain";
import { colors } from "@/theme/tokens";

export function PlaceCard({ place, verified }: { place: WelcomingPlace; verified?: boolean }) {
  const score = place.score == null ? null : Number(place.score);
  return (
    <Link href={{ pathname: "/lugar/[id]", params: { id: place.id } }} asChild>
      <Pressable className="gap-2 rounded-xl border border-border bg-surface p-4 active:opacity-80">
        <View className="flex-row items-center justify-between gap-2">
          <View className="min-w-0 flex-1 flex-row items-center gap-1">
            <Text
              className="font-heading text-base uppercase tracking-wide text-ink"
              numberOfLines={1}
            >
              {place.name}
            </Text>
            {verified && <BadgeCheck color={colors.turquoiseInk} size={16} />}
          </View>
          <Text className="font-body text-xs text-dim">{PLACE_CATEGORIES[place.category]}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          {score == null ? (
            <Text className="font-body text-sm text-dim">Sem avaliações ainda</Text>
          ) : (
            <>
              <Rainbow value={score} size={8} />
              <Text className="font-body-bold text-sm" style={{ color: placeScoreColor(score) }}>
                {score.toFixed(1)}
              </Text>
              <Text className="font-body text-xs text-dim">
                ({place.rating_count}
                {place.rating_count < 3 ? ", poucas" : ""})
              </Text>
            </>
          )}
          {place.flagged && <AlertTriangle color={colors.coralInk} size={14} />}
        </View>
        {!!place.neighborhood && (
          <Text className="font-body text-xs text-dim">{place.neighborhood}</Text>
        )}
      </Pressable>
    </Link>
  );
}
