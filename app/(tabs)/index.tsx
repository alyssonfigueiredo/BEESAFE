import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CityPicker } from "@/components/CityPicker";
import { DangerRanking } from "@/components/DangerRanking";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { StatCard } from "@/components/StatCard";
import { useCityStats } from "@/hooks/useCityStats";
import { useAreaRisk, useOccurrences } from "@/hooks/useOccurrences";
import { usePlaces, useWelcoming } from "@/hooks/usePlaces";
import { PlaceCard } from "@/components/PlaceCard";
import { useCity } from "@/providers/CityProvider";
import { OCCURRENCE_TYPES, RATING_MIN } from "@/theme/domain";
import { colors } from "@/theme/tokens";

export default function HomeScreen() {
  const { city, loading } = useCity();
  const { data: stats } = useCityStats(city?.id);
  const { data: occurrences = [] } = useOccurrences(city?.id);
  const { data: ranking = [] } = useAreaRisk(city?.id, 5);
  const { data: welcoming = [] } = useWelcoming(city?.id, 5);
  const { data: places = [] } = usePlaces(city?.id);

  // O ranking só aceita lugar com RATING_MIN avaliações, e nos primeiros meses isso é ninguém.
  // Até lá mostra quem já recebeu alguma nota: a seção precisa provar que o app está vivo.
  const primeiros = places
    .filter((p) => p.rating_count > 0)
    .sort((a, b) => b.rating_count - a.rating_count)
    .slice(0, 5);

  return (
    <ScrollView className="flex-1 bg-paper" contentContainerClassName="gap-4 px-4 py-4">
      <View className="gap-3 rounded-2xl border border-border bg-surface p-5">
        <Text className="font-body text-xs uppercase tracking-widest text-dim">
          Sua cidade
        </Text>
        <Text className="font-display text-4xl uppercase tracking-widest text-ink">
          {loading ? "Localizando…" : (city?.name ?? "Sem cidade")}
        </Text>
        <CityPicker />
        <Text className="font-body text-sm text-muted">
          Diga quanta cor tem os lugares por onde você passa. E registre, sem se identificar, o que
          não deveria ter acontecido.
        </Text>
        {/* Dois botões do mesmo tamanho: avaliar é o uso de toda semana, registrar é o uso que
            ninguém quer precisar — e nenhum dos dois pode parecer secundário. */}
        <View className="flex-row gap-2">
          <Link href="/lugares" asChild>
            <Pressable className="flex-1 items-center rounded-xl bg-turquoise py-3 active:opacity-80">
              <Text className="font-heading text-sm uppercase tracking-widest text-night">
                Avaliar um lugar
              </Text>
            </Pressable>
          </Link>
          <Link href="/registrar" asChild>
            <Pressable className="flex-1 items-center rounded-xl bg-coral py-3 active:opacity-80">
              <Text className="font-heading text-sm uppercase tracking-widest text-night">
                Registrar relato
              </Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-heading text-base uppercase tracking-widest text-ink">
          {welcoming.length > 0 ? "Lugares mais acolhedores" : "Quanta cor já tem aqui"}
        </Text>
        {welcoming.length > 0 ? (
          welcoming.map((p) => <PlaceCard key={p.id} place={p} />)
        ) : primeiros.length > 0 ? (
          <>
            {primeiros.map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
            <Text className="font-body text-xs text-dim">
              O selo aparece a partir de {RATING_MIN} avaliações. Some a sua.
            </Text>
          </>
        ) : (
          <View className="gap-3 rounded-xl border border-turquoise bg-surface p-4">
            <Text className="font-body text-sm text-muted">
              Ninguém avaliou nenhum lugar em {city?.name ?? "sua cidade"} ainda. As primeiras
              avaliações são as que fazem o mapa existir.
            </Text>
            <Link href="/lugares" asChild>
              <Pressable className="items-center rounded-xl bg-turquoise py-3 active:opacity-80">
                <Text className="font-heading text-sm uppercase tracking-widest text-night">
                  Começar por um lugar
                </Text>
              </Pressable>
            </Link>
          </View>
        )}
      </View>

      <View className="gap-2 pt-2">
        <Text className="font-heading text-base uppercase tracking-widest text-ink">
          Segurança na cidade
        </Text>
        <Text className="font-body text-xs text-dim">
          Relatos anônimos da comunidade. Ponto no mapa, nunca nome de quem escreveu.
        </Text>
      </View>

      <View className="flex-row gap-2">
        <StatCard label="Relatos" value={stats?.total ?? "–"} />
        <StatCard
          label="Últimos 30 dias"
          value={stats?.last_30_days ?? "–"}
          color={colors.yellow}
        />
      </View>
      <View className="flex-row gap-2">
        <StatCard
          label="Mais frequente"
          value={stats?.top_type ? OCCURRENCE_TYPES[stats.top_type].label : "–"}
          color={stats?.top_type ? OCCURRENCE_TYPES[stats.top_type].color : undefined}
        />
        <StatCard
          label="Área crítica"
          value={stats?.top_neighborhood ?? "–"}
          color={colors.coral}
        />
      </View>

      <View className="gap-2">
        <Text className="font-heading text-base uppercase tracking-widest text-ink">
          Relatos recentes
        </Text>
        {occurrences.length === 0 && (
          <Text className="font-body text-sm text-dim">Ainda não há relatos nesta cidade.</Text>
        )}
        {occurrences.slice(0, 6).map((o) => (
          <OccurrenceCard key={o.id} occurrence={o} />
        ))}
      </View>

      <DangerRanking items={ranking} title="Bairros com mais relatos" />
    </ScrollView>
  );
}
