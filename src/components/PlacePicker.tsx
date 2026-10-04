import { MapPin, Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { SecondaryButton } from "@/components/Button";
import { Field } from "@/components/Field";
import { useNearbyPlaces, useSearchPlaces } from "@/hooks/usePlaces";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { useCity } from "@/providers/CityProvider";
import { PLACE_CATEGORIES } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

const RADIUS = 300; // metros: o que dá para chamar de "aqui"
const SHOWN = 6;

export type PickedPlace = { id: string; name: string } | null;

/**
 * Vincula o relato a um estabelecimento cadastrado. Sem isso o raio de 100 m do score pune
 * igual o bar e a calçada da esquina — e o selo "Atenção" nunca dispara por relato.
 */
export function PlacePicker({
  point,
  value,
  onChange,
}: {
  point: { lat: number; lng: number };
  value: PickedPlace;
  onChange: (p: PickedPlace) => void;
}) {
  const { city } = useCity();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  // Os dois vêm do banco: o lote de 1.000 da cidade não cobre Curitiba inteira.
  const { data: perto = [], isLoading } = useNearbyPlaces(point, RADIUS);
  const { data: achados = [], isFetching } = useSearchPlaces(city?.id, search);

  const nearby = perto.map((p) => ({ ...p, meters: p.distance_m }));
  const found = achados
    .map((p) => ({ ...p, meters: distanceMeters(point, { lat: p.latitude, lng: p.longitude }) }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, SHOWN);

  const list = searching ? found : nearby.slice(0, SHOWN);

  if (value) {
    return (
      <View className="gap-2">
        <View
          className="flex-row items-center gap-2 rounded-[18px] bg-solid px-4 py-3"
          style={shadow.fieldFocus}
        >
          <MapPin color={colors.turquoiseInk} size={16} />
          <Text className="flex-1 font-body-medium text-base text-ink" numberOfLines={1}>
            {value.name}
          </Text>
          <Pressable onPress={() => onChange(null)} hitSlop={10}>
            <X color={colors.dim} size={18} />
          </Pressable>
        </View>
        <Text className="font-body text-xs text-muted">
          O lugar fica marcado com o selo Atenção por 30 dias e a nota desconta o relato. Vincule só
          o que aconteceu ali dentro ou na porta.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-2">
      {searching ? (
        <Field
          icon={Search}
          placeholder="Nome do lugar"
          autoFocus
          value={search}
          onChangeText={setSearch}
          right={
            <Pressable
              onPress={() => {
                setSearching(false);
                setSearch("");
              }}
              hitSlop={10}
              accessibilityLabel="Fechar busca"
            >
              <X color={colors.dim} size={18} />
            </Pressable>
          }
        />
      ) : null}

      {list.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => onChange({ id: p.id, name: p.name })}
          className="flex-row items-center gap-2 rounded-[18px] bg-solid px-4 py-3 active:opacity-80"
          style={shadow.field}
        >
          <MapPin color={colors.dim} size={16} />
          <View className="min-w-0 flex-1">
            <Text className="font-body-medium text-base text-ink" numberOfLines={1}>
              {p.name}
            </Text>
            <Text className="font-body text-xs text-dim">
              {PLACE_CATEGORIES[p.category]} · {formatDistance(p.meters)}
            </Text>
          </View>
        </Pressable>
      ))}

      {list.length === 0 && (
        <Text className="font-body text-sm text-dim">
          {isLoading || (searching && isFetching)
            ? "Procurando lugares…"
            : searching
              ? "Nenhum lugar com esse nome nesta cidade."
              : "Nenhum lugar cadastrado num raio de 300 m. O relato entra no mapa do mesmo jeito."}
        </Text>
      )}

      {!searching && (
        <SecondaryButton
          label="Procurar pelo nome do lugar"
          icon={Search}
          onPress={() => setSearching(true)}
        />
      )}
    </View>
  );
}
