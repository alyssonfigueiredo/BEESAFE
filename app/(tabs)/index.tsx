import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { CityPicker } from "@/components/CityPicker";
import { DangerRanking } from "@/components/DangerRanking";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { StatCard } from "@/components/StatCard";
import { useCityStats } from "@/hooks/useCityStats";
import { useAreaRisk, useOccurrences } from "@/hooks/useOccurrences";
import { useWelcoming } from "@/hooks/usePlaces";
import { PlaceCard } from "@/components/PlaceCard";
import { useCity } from "@/providers/CityProvider";
import { OCCURRENCE_TYPES } from "@/theme/domain";
import { colors } from "@/theme/tokens";

export default function HomeScreen() {
  const { city, loading } = useCity();
  const { data: stats } = useCityStats(city?.id);
  const { data: occurrences = [] } = useOccurrences(city?.id);
  const { data: ranking = [] } = useAreaRisk(city?.id, 5);
  const { data: welcoming = [] } = useWelcoming(city?.id, 5);

  return (
    <ScrollView className="flex-1 bg-night" contentContainerClassName="gap-4 px-4 py-4">
      <View className="gap-3 rounded-2xl border border-border bg-surface p-5">
        <Text className="font-body text-xs uppercase tracking-widest text-dim">
          Painel de segurança
        </Text>
        <Text className="font-display text-4xl uppercase tracking-widest text-ink">
          {loading ? "Localizando…" : (city?.name ?? "Sem cidade")}
        </Text>
        <CityPicker />
        <Text className="font-body text-sm text-muted">
          Relatos anônimos da comunidade LGBTQIA+ e áreas que pedem atenção. Registrar leva um
          minuto.
        </Text>
        <View className="flex-row gap-2">
          <Link href="/registrar" asChild>
            <Pressable className="flex-1 items-center rounded-xl bg-coral py-3 active:opacity-80">
              <Text className="font-heading text-sm uppercase tracking-widest text-night">
                Registrar
              </Text>
            </Pressable>
          </Link>
          <Link href="/mapa" asChild>
            <Pressable className="flex-1 items-center rounded-xl border border-turquoise py-3 active:opacity-80">
              <Text className="font-heading text-sm uppercase tracking-widest text-turquoise">
                Ver mapa
              </Text>
            </Pressable>
          </Link>
        </View>
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

      <View className="gap-2">
        <Text className="font-heading text-base uppercase tracking-widest text-ink">
          Lugares mais acolhedores
        </Text>
        {welcoming.length === 0 && (
          <Text className="font-body text-sm text-dim">
            Entram aqui lugares com 3 ou mais avaliações. Avalie um lugar para começar.
          </Text>
        )}
        {welcoming.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
      </View>

      <DangerRanking items={ranking} title="Bairros com mais relatos" />
    </ScrollView>
  );
}
