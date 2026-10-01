import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";

import { useScreenInsets } from "@/hooks/useScreenInsets";
import { Aurora } from "@/components/Aurora";
import { Chip } from "@/components/Chip";
import { PlaceCard } from "@/components/PlaceCard";
import { SearchField } from "@/components/SearchField";
import { usePlaceCount, usePlaces, useSearchPlaces } from "@/hooks/usePlaces";
import { distanceMeters } from "@/lib/geo";
import { useCity } from "@/providers/CityProvider";
import { PLACE_CATEGORIES, type PlaceCategory } from "@/theme/domain";

// Busca sem acento e sem caixa: "cafe" acha "Café".
const simplifica = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function LugaresScreen() {
  const insets = useScreenInsets();
  const { city, loading, userLocation } = useCity();
  const { data: places = [], isLoading } = usePlaces(city?.id);
  const [busca, setBusca] = useState("");
  // Com dois caracteres a busca vai ao banco: a cidade tem muito mais lugar do que o lote
  // carregado, então filtrar só o que está na memória esconde lugar que existe.
  const { data: achados, isFetching: buscando } = useSearchPlaces(city?.id, busca);
  const { data: totalCidade } = usePlaceCount(city?.id);
  const [categoria, setCategoria] = useState<PlaceCategory | "all">("all");
  // Recorte transversal à categoria, só para responder "onde a comunidade já falou".
  // NÃO existe filtro por alerta aqui de propósito: relato é da rua, do beco, da praça — filtrar
  // lugar por ele faria a violência parecer atributo do bar, e puniria quem só está perto.
  // O alerta aparece como contexto no cartão e como área no Mapa, que é onde ele é verdadeiro.
  const [recorte, setRecorte] = useState<"tudo" | "avaliados">("tudo");

  // Categorias na ordem do domínio, só as que existem nesta cidade, com a contagem.
  const avaliados = useMemo(() => places.filter((p) => p.rating_count > 0).length, [places]);

  const categorias = useMemo(() => {
    const n: Partial<Record<PlaceCategory, number>> = {};
    for (const p of places) n[p.category] = (n[p.category] ?? 0) + 1;
    return (Object.keys(PLACE_CATEGORIES) as PlaceCategory[])
      .filter((c) => n[c])
      .map((c) => ({
        key: c,
        label: PLACE_CATEGORIES[c],
        total: n[c]!,
      }));
  }, [places]);

  // Perto de você primeiro; sem localização, por nome. Quem já tem nota não sobe por isso —
  // a lista é para achar um lugar, o ranking fica no Início.
  const lista = useMemo(() => {
    const termo = simplifica(busca.trim());
    const base = busca.trim().length >= 2 ? (achados ?? []) : places;
    const comDistancia = base
      .filter((p) => categoria === "all" || p.category === categoria)
      .filter((p) => recorte !== "avaliados" || p.rating_count > 0)
      .filter((p) => !termo || simplifica(p.name).includes(termo))
      .map((p) => ({
        place: p,
        distance: userLocation
          ? distanceMeters(userLocation, { lat: p.latitude, lng: p.longitude })
          : null,
      }));
    return comDistancia.sort((a, b) =>
      a.distance != null && b.distance != null
        ? a.distance - b.distance
        : a.place.name.localeCompare(b.place.name, "pt-BR"),
    );
  }, [places, achados, busca, categoria, recorte, userLocation]);

  if (loading || !city) {
    return (
      <View className="flex-1 items-center justify-center bg-paper px-6">
        <Text className="font-body text-base text-muted">
          {loading ? "Localizando sua cidade…" : "Nenhuma cidade encontrada."}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Aurora />
      <FlatList
        className="flex-1"
        contentContainerClassName="gap-3 px-4"
        contentContainerStyle={insets}
        data={lista}
        keyExtractor={(item) => item.place.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="gap-3">
            <View>
              <Text className="font-display text-2xl uppercase tracking-wide text-ink">
                Lugares
              </Text>
              <Text className="font-body text-sm text-dim">
                {city.name} · {city.state}
                {totalCidade != null ? ` · ${totalCidade} cadastrados` : ""}
              </Text>
            </View>

            <SearchField placeholder="Buscar por nome" value={busca} onChangeText={setBusca} />

            {avaliados > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerClassName="gap-2"
              >
                <Chip label="Tudo" active={recorte === "tudo"} onPress={() => setRecorte("tudo")} />
                <Chip
                  label={`Já avaliados (${avaliados})`}
                  active={recorte === "avaliados"}
                  onPress={() => setRecorte("avaliados")}
                />
              </ScrollView>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-2"
            >
              <Chip
                label={userLocation ? "Perto de você" : "Todos"}
                active={categoria === "all"}
                onPress={() => setCategoria("all")}
              />
              {categorias.map((c) => (
                <Chip
                  key={c.key}
                  label={`${c.label} (${c.total})`}
                  active={categoria === c.key}
                  onPress={() => setCategoria(c.key)}
                />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item, index }) => (
          <PlaceCard place={item.place} distance={item.distance} index={index} />
        )}
        ListEmptyComponent={
          <Text className="font-body text-sm text-dim">
            {isLoading || buscando ? "Carregando…" : "Nada com esse nome por aqui."}
          </Text>
        }
        ListFooterComponent={
          <Link href={{ pathname: "/registrar", params: { modo: "lugar" } }} asChild>
            <Pressable className="items-center py-3 active:opacity-70">
              <Text className="font-body text-sm text-turquoiseInk underline">
                Não achou? Cadastre um lugar
              </Text>
            </Pressable>
          </Link>
        }
      />
    </View>
  );
}
