import * as Location from "expo-location";
import { Crosshair } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { CityMap } from "@/components/CityMap";
import { useCreatePlace } from "@/hooks/usePlaces";
import { useCity } from "@/providers/CityProvider";
import { PLACE_CATEGORIES, type PlaceCategory } from "@/theme/domain";
import { colors } from "@/theme/tokens";

const CATEGORY_KEYS = Object.keys(PLACE_CATEGORIES) as PlaceCategory[];

export function PlaceForm({ onDone }: { onDone: (placeId: string) => void }) {
  const { city, userLocation } = useCity();
  const create = useCreatePlace();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("bar");
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Sem permissão de localização", "Toque no mapa para marcar o ponto.");
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  async function submit() {
    if (name.trim().length < 2) return Alert.alert("Falta o nome", "Dê um nome ao lugar.");
    if (!point) return Alert.alert("Falta o local", "Use sua localização ou toque no mapa.");
    try {
      const id = await create.mutateAsync({
        name,
        category,
        address,
        lat: point.lat,
        lng: point.lng,
      });
      onDone(id);
    } catch (e) {
      Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo.");
    }
  }

  const center =
    point ??
    userLocation ??
    (city ? { lat: city.lat, lng: city.lng } : { lat: -15.78, lng: -47.93 });

  return (
    <View className="gap-5">
      <View className="gap-2">
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">Nome</Text>
        <TextInput
          className="rounded-xl border border-border bg-surface px-4 py-3 font-body text-base text-ink"
          placeholder="Ex.: Bar da Esquina"
          placeholderTextColor={colors.dim}
          maxLength={80}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View className="gap-2">
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">Categoria</Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORY_KEYS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setCategory(k)}
              className="rounded-full border px-3 py-2"
              style={{
                borderColor: colors.turquoise,
                backgroundColor: category === k ? colors.turquoise : "transparent",
              }}
            >
              <Text
                className="font-body-medium text-xs"
                style={{ color: category === k ? colors.night : colors.turquoiseInk }}
              >
                {PLACE_CATEGORIES[k]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">
          Endereço (opcional)
        </Text>
        <TextInput
          className="rounded-xl border border-border bg-surface px-4 py-3 font-body text-base text-ink"
          placeholder="Rua e número"
          placeholderTextColor={colors.dim}
          maxLength={200}
          value={address}
          onChangeText={setAddress}
        />
      </View>

      <View className="gap-2">
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">Local</Text>
        <Pressable
          onPress={useMyLocation}
          className="flex-row items-center justify-center gap-2 rounded-xl border border-turquoise py-3 active:opacity-80"
        >
          <Crosshair color={colors.turquoiseInk} size={18} />
          <Text className="font-heading text-sm uppercase tracking-widest text-turquoiseInk">
            Estou no lugar agora
          </Text>
        </Pressable>
        <CityMap
          occurrences={[]}
          center={center}
          zoom={point ? 16 : 12}
          onPick={setPoint}
          picked={point}
          style={{ height: 260 }}
        />
      </View>

      <Pressable
        disabled={create.isPending}
        onPress={submit}
        className="items-center rounded-xl bg-turquoise py-4 active:opacity-80 disabled:opacity-50"
      >
        <Text className="font-heading text-lg uppercase tracking-widest text-night">
          {create.isPending ? "Salvando…" : "Adicionar lugar"}
        </Text>
      </Pressable>
    </View>
  );
}
