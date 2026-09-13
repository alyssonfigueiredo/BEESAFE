import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Stack, useLocalSearchParams } from "expo-router";
import { AlertTriangle, BadgeCheck } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { CityMap } from "@/components/CityMap";
import { Stars } from "@/components/Stars";
import { usePlace, usePlaceRatings, useRatePlace } from "@/hooks/usePlaces";
import { PLACE_CATEGORIES, placeScoreColor } from "@/theme/domain";
import { colors } from "@/theme/tokens";

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: place, isLoading } = usePlace(id);
  const { data: ratings = [] } = usePlaceRatings(id);
  const rate = useRatePlace(id);
  const mine = ratings.find((r) => r.is_mine);
  const [draft, setDraft] = useState<{ key: string; stars: number; comment: string } | null>(null);
  const mineKey = mine ? `${mine.id}:${mine.updated_at}` : "none";
  // Reinicia o rascunho quando a avaliação própria muda (padrão "derive state from props").
  const current =
    draft?.key === mineKey
      ? draft
      : { key: mineKey, stars: mine?.stars ?? 0, comment: mine?.comment ?? "" };
  const stars = current.stars;
  const comment = current.comment;
  const setStars = (v: number) => setDraft({ ...current, stars: v });
  const setComment = (v: string) => setDraft({ ...current, comment: v });

  async function submit() {
    if (!stars) return Alert.alert("Escolha de 1 a 5 estrelas.");
    try {
      await rate.mutateAsync({ stars, comment });
      Alert.alert(
        mine ? "Avaliação atualizada" : "Avaliação registrada",
        "Obrigado por ajudar a comunidade.",
      );
    } catch (e) {
      Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo.");
    }
  }

  if (isLoading || !place) {
    return (
      <View className="flex-1 items-center justify-center bg-night">
        <Text className="font-body text-muted">
          {isLoading ? "Carregando…" : "Lugar não encontrado."}
        </Text>
      </View>
    );
  }

  const score = place.score == null ? null : Number(place.score);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: place.name,
          headerStyle: { backgroundColor: colors.night },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontFamily: "Oswald_500Medium" },
        }}
      />
      <ScrollView
        className="flex-1 bg-night"
        contentContainerClassName="gap-4 px-4 py-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2 rounded-2xl border border-border bg-surface p-5">
          <View className="flex-row items-center gap-2">
            <Text className="font-display text-3xl uppercase tracking-widest text-ink">
              {place.name}
            </Text>
            {place.verified && <BadgeCheck color={colors.turquoise} size={20} />}
          </View>
          <Text className="font-body text-sm text-dim">
            {PLACE_CATEGORIES[place.category]}
            {place.neighborhood ? ` · ${place.neighborhood}` : ""} · {place.city}
          </Text>
          {!!place.address && <Text className="font-body text-sm text-muted">{place.address}</Text>}

          <View className="mt-2 flex-row items-center gap-3">
            {score == null ? (
              <Text className="font-body text-base text-dim">
                Sem avaliações ainda. Seja a primeira pessoa.
              </Text>
            ) : (
              <>
                <Text className="font-display text-4xl" style={{ color: placeScoreColor(score) }}>
                  {score.toFixed(1)}
                </Text>
                <View>
                  <Stars value={score} />
                  <Text className="font-body text-xs text-dim">
                    {place.rating_count} avaliaç{place.rating_count === 1 ? "ão" : "ões"}
                    {place.rating_count < 3 ? " · poucas para o ranking" : ""}
                  </Text>
                </View>
              </>
            )}
          </View>

          {place.flagged && (
            <View className="mt-2 flex-row items-start gap-2 rounded-xl border border-coral/60 bg-night p-3">
              <AlertTriangle color={colors.coral} size={18} />
              <Text className="flex-1 font-body text-sm text-muted">
                {place.recent_occurrences} relato{place.recent_occurrences === 1 ? "" : "s"} num
                raio de 100 m nos últimos 6 meses
                {place.recent_high_occurrences > 0
                  ? `, ${place.recent_high_occurrences} grave${place.recent_high_occurrences === 1 ? "" : "s"}`
                  : ""}
                .{place.recent_high_occurrences > 0 ? " A nota já desconta isso." : ""}
              </Text>
            </View>
          )}
        </View>

        <CityMap
          occurrences={[]}
          center={{ lat: place.latitude, lng: place.longitude }}
          zoom={16}
          picked={{ lat: place.latitude, lng: place.longitude }}
          onPick={() => {}}
          style={{ height: 180 }}
        />

        <View className="gap-3 rounded-xl border border-border bg-surface p-4">
          <Text className="font-heading text-base uppercase tracking-widest text-ink">
            {mine ? "Sua avaliação" : "Avaliar este lugar"}
          </Text>
          <Stars value={stars} size={32} onChange={setStars} color={colors.yellow} />
          <TextInput
            className="min-h-20 rounded-xl border border-border bg-night px-4 py-3 font-body text-base text-ink"
            placeholder="Como foi a experiência? (opcional, até 500 caracteres)"
            placeholderTextColor={colors.dim}
            multiline
            textAlignVertical="top"
            maxLength={500}
            value={comment}
            onChangeText={setComment}
          />
          <Pressable
            disabled={rate.isPending}
            onPress={submit}
            className="items-center rounded-xl bg-yellow py-3 active:opacity-80 disabled:opacity-50"
          >
            <Text className="font-heading text-base uppercase tracking-widest text-night">
              {rate.isPending ? "Enviando…" : mine ? "Atualizar" : "Enviar avaliação"}
            </Text>
          </Pressable>
        </View>

        <View className="gap-2">
          <Text className="font-heading text-base uppercase tracking-widest text-ink">
            Avaliações
          </Text>
          {ratings.length === 0 && (
            <Text className="font-body text-sm text-dim">Nenhuma ainda.</Text>
          )}
          {ratings.map((r) => (
            <View key={r.id} className="gap-1 rounded-xl border border-border bg-surface p-4">
              <View className="flex-row items-center justify-between">
                <Stars value={r.stars} size={14} color={colors.yellow} />
                <Text className="font-body text-xs text-dim">
                  {r.nickname}
                  {r.is_mine ? " (você)" : ""} ·{" "}
                  {formatDistanceToNow(parseISO(r.updated_at), { locale: ptBR, addSuffix: true })}
                </Text>
              </View>
              {!!r.comment && <Text className="font-body text-sm text-muted">{r.comment}</Text>}
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
