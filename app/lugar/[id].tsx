import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Stack, useLocalSearchParams } from "expo-router";
import { AlertTriangle, BadgeCheck, Navigation } from "lucide-react-native";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { AreaLevel } from "@/components/AreaLevel";
import { AxisBars } from "@/components/AxisBars";
import { Badge } from "@/components/Badge";
import { IrisScore } from "@/components/IrisScore";
import { PlacePhoto } from "@/components/PlacePhoto";
import { Rainbow } from "@/components/Rainbow";
import { ReportButton } from "@/components/ReportButton";
import { usePlace, usePlaceRatings, useRatePlace } from "@/hooks/usePlaces";
import { AXES, AXIS_KEYS, BADGES, PLACE_CATEGORIES, placeScoreColor } from "@/theme/domain";
import type { Axis } from "@/theme/domain";
import { colors } from "@/theme/tokens";

type Draft = Record<Axis, number> & { key: string; comment: string };

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: place, isLoading } = usePlace(id);
  const { data: ratings = [] } = usePlaceRatings(id);
  const rate = useRatePlace(id);
  const mine = ratings.find((r) => r.is_mine);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [abrirForm, setAbrirForm] = useState(false);
  const mineKey = mine ? `${mine.id}:${mine.updated_at}` : "none";
  // Reinicia o rascunho quando a avaliação própria muda (padrão "derive state from props").
  const current: Draft =
    draft?.key === mineKey
      ? draft
      : {
          key: mineKey,
          welcome: mine?.welcome ?? 0,
          affection: mine?.affection ?? 0,
          restroom: mine?.restroom ?? 0,
          crowd: mine?.crowd ?? 0,
          comment: mine?.comment ?? "",
        };
  const missing = AXIS_KEYS.filter((k) => !current[k]);

  async function submit() {
    if (missing.length) return Alert.alert(`Falta responder: ${AXES[missing[0]].label}.`);
    try {
      await rate.mutateAsync({
        welcome: current.welcome,
        affection: current.affection,
        restroom: current.restroom,
        crowd: current.crowd,
        comment: current.comment,
      });
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
      <View className="flex-1 items-center justify-center bg-paper">
        <Text className="font-body text-muted">
          {isLoading ? "Carregando…" : "Lugar não encontrado."}
        </Text>
      </View>
    );
  }

  const score = place.score == null ? null : Number(place.score);
  // Sem nota nenhuma, o formulário já vem aberto: é a única coisa útil a fazer. Com nota, vira
  // um botão, para quem só quer consultar não rolar quatro perguntas.
  const formVisivel = score == null || !!mine || abrirForm;

  function comoChegar() {
    const { latitude: lat, longitude: lng, name } = place!;
    const url = Platform.select({
      ios: `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(name)}`,
      default: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`,
    });
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`),
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: "Voltar",
          // O nome já é o título do cartão; repetir no header era ruído.
          title: "",
          headerStyle: { backgroundColor: colors.paper },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        className="flex-1 bg-paper"
        contentContainerClassName="gap-4 px-4 py-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-2 rounded-2xl border border-border bg-surface p-5">
          <PlacePhoto
            category={place.category}
            photoName={place.photo_name}
            photoAuthor={place.photo_author}
            photoAuthorUri={place.photo_author_uri}
            variant="banner"
          />
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 font-display text-3xl uppercase tracking-widest text-ink">
              {place.name}
            </Text>
            {place.verified && <BadgeCheck color={colors.turquoiseInk} size={20} />}
          </View>
          <Text className="font-body text-sm text-dim">
            {PLACE_CATEGORIES[place.category]}
            {place.neighborhood ? ` · ${place.neighborhood}` : ""} · {place.city}
          </Text>
          {!!place.address && <Text className="font-body text-sm text-muted">{place.address}</Text>}

          {/* Segurança antes da nota: quem abre a ficha decidindo se vai precisa disto primeiro.
              Dois avisos distintos e nessa ordem: a região (sobre a rua) e, só se existir, o relato
              que aponta este lugar (sobre o lugar, e aí sim desconta da nota). */}
          {place.area_level && <AreaLevel level={place.area_level} size="lg" />}

          {place.recent_on_site > 0 && (
            <View className="mt-1 flex-row items-start gap-2 rounded-xl border border-coral/60 bg-paper p-3">
              <AlertTriangle color={colors.coralInk} size={18} />
              <Text className="flex-1 font-body text-sm text-muted">
                {place.recent_on_site} relato{place.recent_on_site === 1 ? "" : "s"} apontando este
                lugar nos últimos 6 meses
                {place.recent_high_occurrences > 0
                  ? `, ${place.recent_high_occurrences} grave${place.recent_high_occurrences === 1 ? "" : "s"}`
                  : ""}
                .{place.recent_high_occurrences > 0 ? " A nota desconta isso." : ""}
              </Text>
            </View>
          )}

          {/* A pergunta abre a seção do acolhimento nos dois casos: com nota ela nomeia o que os
              quatro eixos respondem; sem nota, é o convite para alguém responder primeiro. */}
          <Text className="mt-3 font-display text-lg text-ink">Quanta cor tem esse lugar?</Text>

          {score == null ? (
            <Text className="font-body text-base text-dim">
              Ninguém avaliou ainda. Seja a primeira pessoa a dizer.
            </Text>
          ) : (
            <View className="mt-2 gap-3">
              <View className="flex-row items-center gap-3">
                <IrisScore value={score} size={54} />
                <View className="flex-1 gap-1">
                  <Text className="font-display text-4xl" style={{ color: placeScoreColor(score) }}>
                    {score.toFixed(1)}
                  </Text>
                  {place.badge && <Badge badge={place.badge} size="lg" />}
                  <Text className="font-body text-xs text-dim">
                    {place.rating_count} avaliaç{place.rating_count === 1 ? "ão" : "ões"} de quem
                    frequenta
                  </Text>
                </View>
              </View>
              {place.badge && (
                <Text className="font-body text-xs text-muted">{BADGES[place.badge].note}</Text>
              )}
              <AxisBars
                scores={{
                  welcome: place.score_welcome,
                  affection: place.score_affection,
                  restroom: place.score_restroom,
                  crowd: place.score_crowd,
                }}
              />
            </View>
          )}
        </View>

        <Pressable
          onPress={comoChegar}
          className="flex-row items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 active:opacity-80"
        >
          <Navigation color={colors.turquoiseInk} size={18} />
          <Text className="font-body-medium text-sm text-ink">Como chegar</Text>
        </Pressable>

        {formVisivel ? (
          <View className="gap-4 rounded-xl border border-border bg-surface p-4">
            <Text className="font-heading text-base uppercase tracking-widest text-ink">
              {mine ? "Sua avaliação" : "Como foi lá?"}
            </Text>
            {AXIS_KEYS.map((k) => (
              <View key={k} className="gap-2">
                <Text className="font-body-medium text-sm text-ink">{AXES[k].question}</Text>
                <Text className="font-body text-xs text-dim">{AXES[k].hint}</Text>
                <Rainbow
                  value={current[k]}
                  size={16}
                  onChange={(v) => setDraft({ ...current, [k]: v })}
                />
              </View>
            ))}
            <TextInput
              className="min-h-20 rounded-xl border border-border bg-paper px-4 py-3 font-body text-base text-ink"
              placeholder="Quer contar como foi? (opcional, até 500 caracteres)"
              placeholderTextColor={colors.dim}
              multiline
              textAlignVertical="top"
              maxLength={500}
              value={current.comment}
              onChangeText={(v) => setDraft({ ...current, comment: v })}
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
        ) : (
          <Pressable
            onPress={() => setAbrirForm(true)}
            className="items-center rounded-xl border border-border bg-surface py-3 active:opacity-80"
          >
            <Text className="font-heading text-base uppercase tracking-widest text-muted">
              Avaliar este lugar
            </Text>
          </Pressable>
        )}

        {ratings.length > 0 && (
          <View className="gap-2">
            <Text className="font-heading text-base uppercase tracking-widest text-ink">
              Avaliações
            </Text>
            {ratings.map((r) => (
              <View key={r.id} className="gap-1 rounded-xl border border-border bg-surface p-4">
                <View className="flex-row items-center justify-between">
                  <Rainbow value={Number(r.overall ?? r.stars ?? 0)} size={7} />
                  <Text className="font-body text-xs text-dim">
                    {r.nickname}
                    {r.is_mine ? " (você)" : ""} ·{" "}
                    {formatDistanceToNow(parseISO(r.updated_at), { locale: ptBR, addSuffix: true })}
                  </Text>
                </View>
                <AxisBars
                  scores={{
                    welcome: r.welcome,
                    affection: r.affection,
                    restroom: r.restroom,
                    crowd: r.crowd,
                  }}
                  size={5}
                />
                {!!r.comment && <Text className="font-body text-sm text-muted">{r.comment}</Text>}
                {!r.is_mine && <ReportButton type="rating" id={r.id} compact />}
              </View>
            ))}
          </View>
        )}

        {/* Denúncia do lugar fica no fim: ação rara, não precisa de lugar nobre. */}
        <View className="items-start pb-4">
          <ReportButton type="place" id={place.id} />
        </View>
      </ScrollView>
    </>
  );
}
