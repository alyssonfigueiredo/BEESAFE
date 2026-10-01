import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Crosshair, Search } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

import { Chip } from "@/components/Chip";
import { CityMap } from "@/components/CityMap";
import { useCreatePlace, useSimilarPlaces } from "@/hooks/usePlaces";
import { geocodificar } from "@/lib/geocode";
import { useCity } from "@/providers/CityProvider";
import { PLACE_CATEGORIES, type PlaceCategory } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

const CATEGORY_KEYS = Object.keys(PLACE_CATEGORIES) as PlaceCategory[];

// O aviso de repetido agora alcança a cidade inteira, então a distância pode ser de quilômetros.
const distancia = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`;

export function PlaceForm({ onDone }: { onDone: (placeId: string) => void }) {
  const { city, userLocation } = useCity();
  const router = useRouter();
  const create = useCreatePlace();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("bar");
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  // `foco` leva a câmera até o ponto; só o GPS e o endereço achado mexem nela (toque no mapa não).
  const [foco, setFoco] = useState<{ lat: number; lng: number } | null>(null);
  const [achando, setAchando] = useState(false);
  const [rotulo, setRotulo] = useState<string | null>(null);
  // Sugere o que já existe antes de criar outro. O banco ainda barra o duplicado óbvio
  // (trigger da migration 10); isto aqui é para a pessoa não chegar lá e levar um erro.
  const similar = useSimilarPlaces(name, point);
  const jaExistem = similar.data ?? [];

  async function useMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted")
        return Alert.alert("Sem permissão de localização", "Toque no mapa para marcar o ponto.");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPoint(p);
      setFoco(p);
      setRotulo(null);
    } catch {
      Alert.alert(
        "Não consegui sua localização",
        "Confira se a localização do celular está ligada, ou toque no mapa para marcar o ponto.",
      );
    }
  }

  // A cidade e o bairro do lugar saem da coordenada, não do texto: sem isto, quem escrevia o
  // endereço de outra cidade e marcava "estou no lugar agora" cadastrava o lugar onde estava.
  async function acharEndereco() {
    if (!city) return;
    if (address.trim().length < 4)
      return Alert.alert("Escreva o endereço", "Rua e número, como “Rua XV de Novembro, 100”.");
    setAchando(true);
    try {
      const achado = await geocodificar(address, city);
      if (!achado)
        return Alert.alert(
          "Não achei esse endereço",
          `Confira a escrita, ou toque no mapa para marcar o ponto. A busca procura em ${city.name}.`,
        );
      setPoint({ lat: achado.lat, lng: achado.lng });
      setFoco({ lat: achado.lat, lng: achado.lng });
      setRotulo(achado.rotulo);
      if (!achado.cidadeConfere)
        Alert.alert(
          "Esse endereço não é dessa cidade",
          `Achei em outro município. Sua cidade está marcada como ${city.name} — troque a cidade no Perfil, ou toque no mapa para marcar o ponto certo.`,
        );
    } catch (e) {
      Alert.alert("Não deu certo", e instanceof Error ? e.message : "Tente de novo.");
    } finally {
      setAchando(false);
    }
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
      // Limpa antes de sair: a tela fica montada no fundo (aba escondida), então voltar
      // encontraria o formulário preenchido com o lugar que já foi criado.
      setName("");
      setAddress("");
      setCategory("bar");
      setPoint(null);
      setFoco(null);
      setRotulo(null);
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
        <Text className="font-body-bold text-xs text-muted">Nome</Text>
        <TextInput
          className="rounded-2xl bg-subtle px-4 py-3 font-body text-base text-ink"
          style={shadow.card}
          placeholder="Ex.: Bar da Esquina"
          placeholderTextColor={colors.dim}
          maxLength={80}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View className="gap-2">
        <Text className="font-body-bold text-xs text-muted">Categoria</Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORY_KEYS.map((k) => (
            <Chip
              key={k}
              label={PLACE_CATEGORIES[k]}
              active={category === k}
              onPress={() => setCategory(k)}
            />
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-body-bold text-xs text-muted">Endereço (opcional)</Text>
        <TextInput
          className="rounded-2xl bg-subtle px-4 py-3 font-body text-base text-ink"
          style={shadow.card}
          placeholder="Rua e número"
          placeholderTextColor={colors.dim}
          maxLength={200}
          value={address}
          onChangeText={setAddress}
          onSubmitEditing={acharEndereco}
          returnKeyType="search"
        />
        <Pressable
          disabled={achando}
          onPress={acharEndereco}
          className="flex-row items-center justify-center gap-2 rounded-full bg-lilac/20 py-3 active:opacity-80 disabled:opacity-50"
        >
          <Search color={colors.lilacInk} size={18} />
          <Text className="font-body-bold text-sm text-lilacInk">
            {achando ? "Procurando…" : "Achar esse endereço no mapa"}
          </Text>
        </Pressable>
      </View>

      <View className="gap-2">
        <Text className="font-body-bold text-xs text-muted">Local</Text>
        <Text className="font-body text-xs text-dim">
          O alfinete é o que vale: a cidade e o bairro do lugar saem dele, não do endereço escrito.
        </Text>
        <Pressable
          onPress={useMyLocation}
          className="flex-row items-center justify-center gap-2 rounded-full bg-turquoise/20 py-3 active:opacity-80"
        >
          <Crosshair color={colors.turquoiseInk} size={18} />
          <Text className="font-body-bold text-sm text-turquoiseInk">Estou no lugar agora</Text>
        </Pressable>
        <CityMap
          occurrences={[]}
          center={center}
          zoom={point ? 16 : 12}
          onPick={(p) => {
            setPoint(p);
            setRotulo(null);
          }}
          picked={point}
          focus={foco}
          style={{ height: 260 }}
        />
        {rotulo && (
          <Text className="font-body text-xs text-turquoiseInk">Achei aqui: {rotulo}</Text>
        )}
      </View>

      {jaExistem.length > 0 && (
        <View className="gap-3 rounded-3xl bg-surface p-4">
          <Text className="font-body-bold text-sm text-ink">
            {jaExistem.length === 1 ? "Já existe um parecido" : "Já existem parecidos"}
          </Text>
          <Text className="font-body text-sm text-dim">
            Se for o mesmo lugar, abra e avalie — a nota da comunidade racha quando o mesmo bar vira
            duas fichas, e nenhuma das duas chega ao selo. Lugar que mudou de endereço aparece aqui
            longe do ponto: é a ficha antiga, com o endereço velho.
          </Text>
          {jaExistem.map((p) => (
            <Pressable
              key={p.id}
              onPress={() => router.push({ pathname: "/lugar/[id]", params: { id: p.id } })}
              className="rounded-xl bg-subtle px-3 py-2 active:opacity-70"
            >
              <Text className="font-body-medium text-base text-ink">{p.name}</Text>
              <Text className="font-body text-xs text-dim">
                {PLACE_CATEGORIES[p.category]}
                {p.neighborhood ? ` · ${p.neighborhood}` : ""} · a {distancia(p.distance_m)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        disabled={create.isPending}
        onPress={submit}
        className="items-center rounded-full bg-turquoise py-4 active:opacity-80 disabled:opacity-50"
        style={shadow.turquoise}
      >
        <Text className="font-body-bold text-base text-night">
          {create.isPending ? "Salvando…" : "Adicionar lugar"}
        </Text>
      </Pressable>
    </View>
  );
}
