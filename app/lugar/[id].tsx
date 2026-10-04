import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { AlertTriangle, BadgeCheck, Camera, Navigation } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, ScrollView, Text, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { TextArea } from "@/components/Field";
import { RewardSheet } from "@/components/gami/RewardSheet";
import {
  fraseDescoberta,
  logDescoberta,
  marcarDescobertaConcluida,
  ORIGEM_DESCOBERTA,
} from "@/hooks/useDiscovery";
import { trackDay, useGamification } from "@/hooks/useGamification";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { AreaLevel } from "@/components/AreaLevel";
import { AxisBars } from "@/components/AxisBars";
import { Badge } from "@/components/Badge";
import { BlockButton } from "@/components/BlockButton";
import { CountUp } from "@/components/CountUp";
import { IrisScore } from "@/components/IrisScore";
import { PlacePhoto } from "@/components/PlacePhoto";
import { RainbowText } from "@/components/RainbowText";
import { Rainbow } from "@/components/Rainbow";
import { ReportButton } from "@/components/ReportButton";
import { useEnviarFotoDoLugar } from "@/hooks/usePlacePhoto";
import { usePlace, usePlaceRatings, useRatePlace } from "@/hooks/usePlaces";
import {
  AXES,
  AXIS_KEYS,
  BADGES,
  PLACE_CATEGORIES,
  axisHint,
  placeScoreColor,
} from "@/theme/domain";
import type { Axis } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

type Draft = Record<Axis, number> & { key: string; comment: string };

export default function PlaceScreen() {
  const insets = useScreenInsets({ tabs: false });
  // `origem` e `avaliar` vêm da descoberta ("Passou por aqui?"): abrem o formulário de sempre e só
  // alimentam discovery_events. A avaliação em si é igual a qualquer outra.
  const { id, origem, avaliar } = useLocalSearchParams<{
    id: string;
    origem?: string;
    avaliar?: string;
  }>();
  const daDescoberta = origem === ORIGEM_DESCOBERTA;
  const { data: place, isLoading } = usePlace(id);
  const { data: ratings = [] } = usePlaceRatings(id);
  const rate = useRatePlace(id);
  const enviarFoto = useEnviarFotoDoLugar(id);
  const mine = ratings.find((r) => r.is_mine);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [abrirForm, setAbrirForm] = useState(false);
  // Gamificação: abrir a ficha conta como consulta do dia; avaliação nova abre a folha de recompensa.
  const { data: gami, refetch: refetchGami } = useGamification();
  const [recompensa, setRecompensa] = useState<{
    antes: number | null;
    frase?: string;
  } | null>(null);
  const forma = gami?.forma ?? 2;
  // Descoberta: "começou a avaliar" é a primeira resposta, uma vez só.
  const comecou = useRef(false);
  // Com ?avaliar=1 o formulário já vem aberto; a tela rola até ele uma vez.
  const scrollRef = useRef<ScrollView>(null);
  const rolouAoForm = useRef(false);
  useEffect(() => {
    if (id) trackDay("consult");
  }, [id]);
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
  // Lugar sem nota: cada pergunta respondida devolve um quarto da cor à foto.
  const respondidas = AXIS_KEYS.length - missing.length;

  function responder(k: Axis, v: number) {
    if (daDescoberta && id && !comecou.current) {
      comecou.current = true;
      logDescoberta("discovery_review_started", id);
    }
    setDraft({ ...current, [k]: v });
  }

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
      if (mine) {
        Alert.alert("Avaliação atualizada", "Obrigado por ajudar a comunidade.");
      } else {
        // A folha mostra o agradecimento de sempre se a gamificação ainda não estiver no banco.
        // Vindo da descoberta, o título é a frase da descoberta e o gomo vira linha pequena.
        if (daDescoberta && id) {
          logDescoberta("discovery_review_completed", id);
          marcarDescobertaConcluida(id);
          setRecompensa({ antes: gami?.gomos ?? null, frase: fraseDescoberta(id) });
        } else {
          setRecompensa({ antes: gami?.gomos ?? null });
        }
        refetchGami();
      }
    } catch (e) {
      Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo.");
    }
  }

  async function mandarFoto() {
    try {
      const url = await enviarFoto.mutateAsync();
      if (url) Alert.alert("Foto enviada", "Enviada. Ela aparece na ficha depois de revisada.");
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
  const formVisivel = score == null || !!mine || abrirForm || avaliar === "1";

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
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1">
        <Aurora />
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="gap-4 px-4"
          contentContainerStyle={insets}
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-2 rounded-[28px] bg-surface p-5" style={shadow.card}>
            <PlacePhoto
              category={place.category}
              photoName={place.photo_name}
              photoUrl={place.photo_url}
              photoCredit={place.photo_credit}
              photoCreditUri={place.photo_credit_uri}
              photoAuthor={place.photo_author}
              photoAuthorUri={place.photo_author_uri}
              variant="banner"
              muted={place.score == null}
              progress={respondidas / AXIS_KEYS.length}
            />
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 font-display text-2xl uppercase tracking-wide text-ink">
                {place.name}
              </Text>
              {place.verified && <BadgeCheck color={colors.turquoiseInk} size={20} />}
            </View>
            {/* O bairro leva para a ficha da área: quem olha um bar quer saber da rua em volta. */}
            <Text className="font-body text-sm text-dim">
              {PLACE_CATEGORIES[place.category]}
              {place.neighborhood && place.neighborhood_id ? (
                <>
                  {" · "}
                  <Link
                    href={{
                      pathname: "/bairro/[id]",
                      params: { id: String(place.neighborhood_id) },
                    }}
                    style={{ color: colors.turquoiseInk, textDecorationLine: "underline" }}
                  >
                    {place.neighborhood}
                  </Link>
                </>
              ) : (
                ""
              )}{" "}
              · {place.city}
            </Text>
            {!!place.address && (
              <Text className="font-body text-sm text-muted">{place.address}</Text>
            )}

            {/* Segurança antes da nota: quem abre a ficha decidindo se vai precisa disto primeiro.
              Dois avisos distintos e nessa ordem: a região (sobre a rua) e, só se existir, o relato
              que aponta este lugar (sobre o lugar, e aí sim desconta da nota). */}
            {place.area_level && <AreaLevel level={place.area_level} size="lg" />}

            {place.recent_on_site > 0 && (
              <View className="mt-1 flex-row items-start gap-2 rounded-2xl bg-coral/15 p-3">
                <AlertTriangle color={colors.coralInk} size={18} />
                <Text className="flex-1 font-body text-sm text-muted">
                  {place.recent_on_site} relato{place.recent_on_site === 1 ? "" : "s"} apontando
                  este lugar nos últimos 6 meses
                  {place.recent_high_occurrences > 0
                    ? `, ${place.recent_high_occurrences} grave${place.recent_high_occurrences === 1 ? "" : "s"}`
                    : ""}
                  .{place.recent_high_occurrences > 0 ? " A nota desconta isso." : ""}
                </Text>
              </View>
            )}

            {/* A pergunta abre a seção do acolhimento nos dois casos: com nota ela nomeia o que os
              quatro eixos respondem; sem nota, é o convite para alguém responder primeiro. */}
            {/* A pergunta da marca, pintada com o arco-íris. */}
            <View className="mt-3">
              <RainbowText size={20}>Quanta cor tem esse lugar?</RainbowText>
            </View>

            {score == null ? (
              <Text className="font-body text-base text-dim">
                {respondidas === AXIS_KEYS.length
                  ? "Esse lugar ganhou cor. Envie a avaliação para ela ficar."
                  : "Ninguém avaliou ainda. Seja a primeira pessoa a dizer."}
              </Text>
            ) : (
              <View className="mt-2 gap-3">
                <View className="flex-row items-center gap-3">
                  <IrisScore value={score} size={54} />
                  <View className="flex-1 gap-1">
                    <CountUp
                      value={score}
                      decimals={1}
                      className="font-display text-4xl"
                      style={{ color: placeScoreColor(score) }}
                    />
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

          <SecondaryButton label="Como chegar" icon={Navigation} onPress={comoChegar} />

          {formVisivel ? (
            <View
              className="gap-4 rounded-3xl bg-surface p-4"
              style={shadow.card}
              onLayout={(e) => {
                if (avaliar !== "1" || rolouAoForm.current) return;
                rolouAoForm.current = true;
                const y = e.nativeEvent.layout.y - insets.paddingTop;
                setTimeout(
                  () => scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: true }),
                  450,
                );
              }}
            >
              <Text className="font-body-bold text-base text-ink">
                {mine ? "Sua avaliação" : "Como foi lá?"}
              </Text>
              {AXIS_KEYS.map((k) => (
                <View key={k} className="gap-2">
                  <Text className="font-body-medium text-sm text-ink">{AXES[k].question}</Text>
                  <Text className="font-body text-xs text-dim">{axisHint(k, forma)}</Text>
                  <Rainbow value={current[k]} size={16} onChange={(v) => responder(k, v)} />
                </View>
              ))}
              <TextArea
                minHeight={88}
                placeholder="Quer contar como foi? (opcional, até 500 caracteres)"
                maxLength={500}
                value={current.comment}
                onChangeText={(v) => setDraft({ ...current, comment: v })}
              />
              <SecondaryButton
                label={
                  enviarFoto.isPending
                    ? "Enviando foto…"
                    : place.photo_source === "usuario"
                      ? "Trocar a foto do lugar"
                      : "Adicionar uma foto do lugar"
                }
                icon={Camera}
                color={colors.lilacInk}
                disabled={enviarFoto.isPending}
                onPress={mandarFoto}
              />
              <PrimaryButton
                tone="yellow"
                label={rate.isPending ? "Enviando…" : mine ? "Atualizar" : "Enviar avaliação"}
                disabled={rate.isPending}
                onPress={submit}
              />
            </View>
          ) : (
            <SecondaryButton
              label="Avaliar este lugar"
              color={colors.ink}
              onPress={() => setAbrirForm(true)}
            />
          )}

          {ratings.length > 0 && (
            <View className="gap-2">
              <Text className="font-body-bold text-base text-ink">Avaliações</Text>
              {ratings.map((r) => (
                <View key={r.id} className="gap-1 rounded-3xl bg-surface p-4" style={shadow.card}>
                  <View className="flex-row items-center justify-between">
                    <Rainbow value={Number(r.overall ?? r.stars ?? 0)} size={7} />
                    <Text className="font-body text-xs text-dim">
                      {r.nickname}
                      {r.is_mine ? " (você)" : ""} ·{" "}
                      {formatDistanceToNow(parseISO(r.updated_at), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
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
                  {!r.is_mine && (
                    <View className="flex-row items-center gap-3">
                      <ReportButton type="rating" id={r.id} compact />
                      <BlockButton type="rating" id={r.id} compact />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Denúncia do lugar fica no fim: ação rara, não precisa de lugar nobre. */}
          <View className="items-start pb-4">
            <ReportButton type="place" id={place.id} />
          </View>
        </ScrollView>
      </View>
      <RewardSheet
        visible={!!recompensa}
        antes={recompensa?.antes ?? null}
        frase={recompensa?.frase}
        onClose={() => setRecompensa(null)}
      />
    </>
  );
}
