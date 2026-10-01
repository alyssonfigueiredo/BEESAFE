import { Link } from "expo-router";
import { Clock, FileText, MapPin, MessageCircle } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { Chip } from "@/components/Chip";
import { CityPicker } from "@/components/CityPicker";
import { DangerRanking } from "@/components/DangerRanking";
import { Mark } from "@/components/Mark";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { PlaceCard } from "@/components/PlaceCard";
import { RainbowLine } from "@/components/Rainbow";
import { SearchField } from "@/components/SearchField";
import { StatCard } from "@/components/StatCard";
import { useCityStats } from "@/hooks/useCityStats";
import { useAreaRisk, useOccurrences } from "@/hooks/useOccurrences";
import { usePlaces, useSearchPlaces, useWelcoming } from "@/hooks/usePlaces";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { distanceMeters } from "@/lib/geo";
import { useCity } from "@/providers/CityProvider";
import { OCCURRENCE_TYPES, PLACE_CATEGORIES, RATING_MIN, type PlaceCategory } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

// Busca sem acento e sem caixa: "cafe" acha "Café".
const simplifica = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Filtro = PlaceCategory | "all" | "rated";

export default function HomeScreen() {
  const insets = useScreenInsets();
  const { city, loading, userLocation } = useCity();
  const { data: stats } = useCityStats(city?.id);
  const { data: occurrences = [] } = useOccurrences(city?.id);
  const { data: ranking = [] } = useAreaRisk(city?.id, 5);
  const { data: welcoming = [] } = useWelcoming(city?.id, 5);
  const { data: places = [] } = usePlaces(city?.id);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("all");
  // Com 2+ letras a busca vai ao banco: o lote carregado não cobre a cidade toda.
  const { data: achados } = useSearchPlaces(city?.id, busca);

  // O ranking só aceita lugar com RATING_MIN avaliações, e nos primeiros meses isso é ninguém.
  // Até lá mostra quem já recebeu alguma nota: a seção precisa provar que o app está vivo.
  const primeiros = places
    .filter((p) => p.rating_count > 0)
    .sort((a, b) => b.rating_count - a.rating_count)
    .slice(0, 5);

  // Busca e filtro direto no Início: quem abre o app querendo achar um bar não deve ter que
  // trocar de aba. Sem termo e sem filtro, a seção volta a ser "mais acolhedores".
  const termo = simplifica(busca.trim());
  const filtrando = !!termo || filtro !== "all";
  const resultado = useMemo(() => {
    if (!filtrando) return [];
    const doBanco = termo.length >= 2;
    const base = doBanco ? (achados ?? []) : places;
    return base
      .filter((p) => filtro === "all" || filtro === "rated" || p.category === filtro)
      .filter((p) => filtro !== "rated" || p.rating_count > 0)
      .filter((p) => doBanco || !termo || simplifica(p.name).includes(termo))
      .map((p) => ({
        place: p,
        distance: userLocation
          ? distanceMeters(userLocation, { lat: p.latitude, lng: p.longitude })
          : null,
      }))
      .sort((a, b) =>
        a.distance != null && b.distance != null
          ? a.distance - b.distance
          : a.place.name.localeCompare(b.place.name, "pt-BR"),
      )
      .slice(0, 20);
  }, [places, achados, filtrando, filtro, termo, userLocation]);

  const categorias = (Object.keys(PLACE_CATEGORIES) as PlaceCategory[]).filter((c) =>
    places.some((p) => p.category === c),
  );

  return (
    <View className="flex-1">
      <Aurora />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-4"
        contentContainerStyle={insets}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cartão principal escuro: a marca em azulejo, a cidade, o fio arco-íris e as duas ações
            do mesmo tamanho (avaliar é o uso de toda semana, registrar é o que ninguém quer
            precisar — nenhum dos dois pode parecer secundário). */}
        <View
          className="gap-3 rounded-[28px] p-5"
          style={[{ backgroundColor: colors.night }, shadow.lift]}
        >
          <View className="flex-row items-center gap-3">
            <View
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(255,255,255,0.10)" }}
            >
              <Mark size={24} />
            </View>
            <Text className="font-body-medium text-[11px] uppercase tracking-wider text-paper/60">
              Sua cidade
            </Text>
          </View>
          <Text className="font-display text-3xl uppercase tracking-wide text-paper">
            {loading ? "Localizando…" : (city?.name ?? "Sem cidade")}
          </Text>
          <CityPicker tone="dark" />
          <RainbowLine />
          <Text className="font-body text-sm text-paper/75">
            O mapa dos lugares onde a gente é{" "}
            <Text className="font-body-bold text-yellow">bem-vinde</Text>, feito por nós. Diga
            quanta cor tem os lugares por onde você passa. E registre, sem se identificar, o que não
            deveria ter acontecido.
          </Text>
          <View className="flex-row gap-2 pt-1">
            <Link href="/lugares" asChild>
              <Pressable
                className="flex-1 items-center rounded-full bg-turquoise py-3 active:opacity-80"
                style={shadow.turquoise}
              >
                <Text className="font-body-bold text-sm text-night">Avaliar um lugar</Text>
              </Pressable>
            </Link>
            <Link href="/registrar" asChild>
              <Pressable
                className="flex-1 items-center rounded-full bg-coral py-3 active:opacity-80"
                style={shadow.coral}
              >
                <Text className="font-body-bold text-sm text-night">Registrar relato</Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View className="gap-2">
          <SearchField
            placeholder={`Buscar um lugar em ${city?.name ?? "sua cidade"}`}
            value={busca}
            onChangeText={setBusca}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            <Chip
              label={userLocation ? "Perto de você" : "Todos"}
              active={filtro === "all"}
              onPress={() => setFiltro("all")}
            />
            {primeiros.length > 0 && (
              <Chip
                label="Já avaliados"
                active={filtro === "rated"}
                onPress={() => setFiltro("rated")}
              />
            )}
            {categorias.map((c) => (
              <Chip
                key={c}
                label={PLACE_CATEGORIES[c]}
                active={filtro === c}
                onPress={() => setFiltro(filtro === c ? "all" : c)}
              />
            ))}
          </ScrollView>
        </View>

        <View className="gap-2">
          <Text className="font-body-bold text-base text-ink">
            {filtrando
              ? `${resultado.length} lugar${resultado.length === 1 ? "" : "es"}`
              : welcoming.length > 0
                ? "Lugares mais acolhedores"
                : "Quanta cor já tem aqui"}
          </Text>
          {filtrando ? (
            resultado.length === 0 ? (
              <Text className="font-body text-sm text-dim">Nada com esse nome por aqui.</Text>
            ) : (
              resultado.map((r, i) => (
                <PlaceCard key={r.place.id} place={r.place} distance={r.distance} index={i} />
              ))
            )
          ) : welcoming.length > 0 ? (
            welcoming.map((p, i) => <PlaceCard key={p.id} place={p} index={i} />)
          ) : primeiros.length > 0 ? (
            <>
              {primeiros.map((p, i) => (
                <PlaceCard key={p.id} place={p} index={i} />
              ))}
              <Text className="font-body text-xs text-dim">
                O selo aparece a partir de {RATING_MIN} avaliações. Some a sua.
              </Text>
            </>
          ) : (
            <View className="gap-3 rounded-3xl bg-surface p-4" style={shadow.card}>
              <Text className="font-body text-sm text-muted">
                Ninguém avaliou nenhum lugar em {city?.name ?? "sua cidade"} ainda. As primeiras
                avaliações são as que fazem o mapa existir.
              </Text>
              <Link href="/lugares" asChild>
                <Pressable
                  className="items-center rounded-full bg-turquoise py-3 active:opacity-80"
                  style={shadow.turquoise}
                >
                  <Text className="font-body-bold text-sm text-night">Começar por um lugar</Text>
                </Pressable>
              </Link>
            </View>
          )}
        </View>

        <View className="gap-1 pt-2">
          <Text className="font-body-bold text-base text-ink">Segurança na cidade</Text>
          <Text className="font-body text-xs text-dim">
            Relatos anônimos da comunidade. Ponto no mapa, nunca nome de quem escreveu.
          </Text>
        </View>

        <View className="flex-row gap-2">
          <StatCard label="Relatos" value={stats?.total ?? "–"} icon={FileText} />
          <StatCard
            label="Últimos 30 dias"
            value={stats?.last_30_days ?? "–"}
            color={colors.yellow}
            icon={Clock}
          />
        </View>
        <View className="flex-row gap-2">
          <StatCard
            label="Mais frequente"
            value={stats?.top_type ? OCCURRENCE_TYPES[stats.top_type].label : "–"}
            color={stats?.top_type ? OCCURRENCE_TYPES[stats.top_type].color : colors.orange}
            icon={MessageCircle}
          />
          <StatCard
            label="Área crítica"
            value={stats?.top_neighborhood ?? "–"}
            color={colors.coral}
            icon={MapPin}
          />
        </View>

        <View className="gap-2">
          <Text className="font-body-bold text-base text-ink">Relatos recentes</Text>
          {occurrences.length === 0 && (
            <Text className="font-body text-sm text-dim">Ainda não há relatos nesta cidade.</Text>
          )}
          {occurrences.slice(0, 6).map((o, i) => (
            <OccurrenceCard key={o.id} occurrence={o} index={i} />
          ))}
        </View>

        <DangerRanking items={ranking} title="Bairros com mais relatos" />
      </ScrollView>
    </View>
  );
}
