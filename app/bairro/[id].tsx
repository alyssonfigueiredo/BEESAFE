import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { PlaceCard } from "@/components/PlaceCard";
import {
  useNeighborhood,
  useNeighborhoodOccurrences,
  useNeighborhoodPlaces,
} from "@/hooks/useNeighborhood";
import {
  DAY_PERIODS,
  OCCURRENCE_SETTINGS,
  OCCURRENCE_TYPES,
  riskLevel,
  type DayPeriod,
  type OccurrenceSetting,
  type OccurrenceType,
} from "@/theme/domain";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { colors, shadow } from "@/theme/tokens";

/**
 * A tela onde os dois lados do app se encontram: o que aconteceu nesta área e onde a comunidade
 * se sente bem dentro dela. Nenhum dos dois julga o outro — ficam lado a lado, e quem lê decide.
 */
export default function BairroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bairroId = Number(id);
  const insets = useScreenInsets({ tabs: false });
  const header = {
    headerShown: true,
    headerBackTitle: "Voltar",
    headerTransparent: true,
    headerStyle: { backgroundColor: "transparent" },
    headerTintColor: colors.ink,
    headerShadowVisible: false,
  } as const;
  const { data: resumo, isLoading } = useNeighborhood(bairroId);
  const { data: lugares = [] } = useNeighborhoodPlaces(bairroId);
  const { data: relatos = [] } = useNeighborhoodOccurrences(bairroId);

  if (isLoading || !resumo) {
    return (
      <View className="flex-1 items-center justify-center bg-paper px-6">
        <Stack.Screen options={{ ...header, title: "Bairro" }} />
        <Text className="font-body text-base text-muted">
          {isLoading ? "Carregando…" : "Bairro não encontrado."}
        </Text>
      </View>
    );
  }

  // O peso é o mesmo de area_risk_ranking: grave conta por três.
  const peso = Number(resumo.total) + 3 * Number(resumo.high);
  const nivel = riskLevel(peso);
  const avaliados = Number(resumo.places_rated);

  return (
    <View className="flex-1">
      <Aurora />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4"
        contentContainerStyle={insets}
      >
        <Stack.Screen options={{ ...header, title: resumo.neighborhood }} />

        {/* Resumo da área em cartão escuro: é o cabeçalho da tela onde os dois lados se encontram. */}
        <View
          className="gap-2 rounded-[28px] p-5"
          style={[{ backgroundColor: colors.night }, shadow.lift]}
        >
          <Text className="font-body-medium text-[11px] uppercase tracking-wider text-paper/60">
            {resumo.city} · {resumo.state}
          </Text>
          <Text className="font-display text-2xl uppercase tracking-wide text-paper">
            {resumo.neighborhood}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="font-body-bold text-sm" style={{ color: nivel.color }}>
              {nivel.label}
            </Text>
            <Text className="font-body text-sm text-paper/60">
              {resumo.total} relato{Number(resumo.total) === 1 ? "" : "s"} em 12 meses
              {Number(resumo.high) > 0
                ? `, ${resumo.high} grave${Number(resumo.high) === 1 ? "" : "s"}`
                : ""}
            </Text>
          </View>
          <Text className="font-body text-xs text-dim">
            {resumo.places_total} lugar{Number(resumo.places_total) === 1 ? "" : "es"} cadastrado
            {Number(resumo.places_total) === 1 ? "" : "s"}
            {avaliados > 0 ? ` · ${avaliados} já avaliado${avaliados === 1 ? "" : "s"}` : ""}
          </Text>
        </View>

        {/* O que a área concentra. Só aparece o que a comunidade informou — campo em branco fica de
          fora em vez de virar "não informado" ocupando espaço. */}
        {Number(resumo.total) > 0 && (
          <View className="gap-4 rounded-3xl bg-surface p-4" style={shadow.card}>
            <Text className="font-body-bold text-base text-ink">O que foi relatado</Text>
            <Contagem
              titulo="Tipo"
              dados={resumo.by_type}
              rotulo={(k) => OCCURRENCE_TYPES[k as OccurrenceType].label}
              cor={(k) => OCCURRENCE_TYPES[k as OccurrenceType].color}
            />
            <Contagem
              titulo="Onde"
              dados={resumo.by_setting}
              rotulo={(k) => OCCURRENCE_SETTINGS[k as OccurrenceSetting].label}
              cor={(k) => OCCURRENCE_SETTINGS[k as OccurrenceSetting].color}
            />
            <Contagem
              titulo="Quando"
              dados={resumo.by_period}
              rotulo={(k) => DAY_PERIODS[k as DayPeriod].label}
              cor={(k) => DAY_PERIODS[k as DayPeriod].color}
            />
          </View>
        )}

        <View className="gap-2">
          <Text className="font-body-bold text-base text-ink">Lugares deste bairro</Text>
          {lugares.length === 0 ? (
            <Text className="font-body text-sm text-dim">Nenhum lugar cadastrado aqui ainda.</Text>
          ) : (
            lugares.map((p, i) => <PlaceCard key={p.id} place={p} index={i} />)
          )}
        </View>

        <View className="gap-2">
          <Text className="font-body-bold text-base text-ink">Relatos deste bairro</Text>
          {relatos.length === 0 ? (
            <Text className="font-body text-sm text-dim">
              Nenhum relato registrado aqui. Isso não quer dizer que a área seja segura — quer dizer
              que ninguém registrou.
            </Text>
          ) : (
            relatos.map((o, i) => <OccurrenceCard key={o.id} occurrence={o} index={i} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/** Barra simples de contagem. Sem eixo e sem número grande: é leitura de relance, não relatório. */
function Contagem({
  titulo,
  dados,
  rotulo,
  cor,
}: {
  titulo: string;
  dados: Record<string, number | undefined>;
  rotulo: (k: string) => string;
  cor: (k: string) => string;
}) {
  const itens = Object.entries(dados)
    .map(([k, v]) => ({ k, v: Number(v ?? 0) }))
    .filter((i) => i.v > 0)
    .sort((a, b) => b.v - a.v);
  if (!itens.length) return null;
  const maior = itens[0].v;

  return (
    <View className="gap-1.5">
      <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
        {titulo}
      </Text>
      {itens.map((i) => (
        <View key={i.k} className="flex-row items-center gap-2">
          <Text className="w-32 font-body text-xs text-muted" numberOfLines={1}>
            {rotulo(i.k)}
          </Text>
          <View
            className="h-2 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: colors.subtle }}
          >
            <View
              style={{
                width: `${Math.round((i.v / maior) * 100)}%`,
                backgroundColor: cor(i.k),
                height: "100%",
              }}
            />
          </View>
          <Text className="w-6 text-right font-body-medium text-xs text-muted">{i.v}</Text>
        </View>
      ))}
    </View>
  );
}
