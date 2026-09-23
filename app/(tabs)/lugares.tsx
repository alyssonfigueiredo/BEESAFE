import { Link } from "expo-router";
import { Search } from "lucide-react-native";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { PlaceCard } from "@/components/PlaceCard";
import { usePlaces } from "@/hooks/usePlaces";
import { distanceMeters } from "@/lib/geo";
import { useCity } from "@/providers/CityProvider";
import { PLACE_CATEGORIES, type PlaceCategory } from "@/theme/domain";
import { colors } from "@/theme/tokens";

// Busca sem acento e sem caixa: "cafe" acha "Café".
const simplifica = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default function LugaresScreen() {
  const { city, loading, userLocation } = useCity();
  const { data: places = [], isLoading } = usePlaces(city?.id);
  const [busca, setBusca] = useState("");
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
    return (Object.keys(PLACE_CATEGORIES) as PlaceCategory[]).filter((c) => n[c]).map((c) => ({
      key: c,
      label: PLACE_CATEGORIES[c],
      total: n[c]!,
    }));
  }, [places]);

  // Perto de você primeiro; sem localização, por nome. Quem já tem nota não sobe por isso —
  // a lista é para achar um lugar, o ranking fica no Início.
  const lista = useMemo(() => {
    const termo = simplifica(busca.trim());
    const comDistancia = places
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
  }, [places, busca, categoria, recorte, userLocation]);

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
    <FlatList
      className="flex-1 bg-paper"
      contentContainerClassName="gap-3 px-4 py-4"
      data={lista}
      keyExtractor={(item) => item.place.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View className="gap-3">
          <View>
            <Text className="font-display text-3xl uppercase tracking-widest text-ink">
              Lugares
            </Text>
            <Text className="font-body text-sm text-dim">
              {city.name} · {city.state} · {places.length} cadastrados
            </Text>
          </View>

          <View className="flex-row items-center gap-2 rounded-xl border border-border bg-surface px-3">
            <Search color={colors.dim} size={18} />
            <TextInput
              className="flex-1 py-3 font-body text-base text-ink"
              placeholder="Buscar por nome"
              placeholderTextColor={colors.dim}
              value={busca}
              onChangeText={setBusca}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

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
      renderItem={({ item }) => <PlaceCard place={item.place} distance={item.distance} />}
      ListEmptyComponent={
        <Text className="font-body text-sm text-dim">
          {isLoading ? "Carregando…" : "Nada com esse nome por aqui."}
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
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="rounded-full border px-3 py-1.5"
      style={{
        borderColor: active ? colors.ink : colors.border,
        backgroundColor: active ? colors.ink : colors.surface,
      }}
    >
      <Text
        className="font-body-medium text-xs"
        style={{ color: active ? colors.paper : colors.muted }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
