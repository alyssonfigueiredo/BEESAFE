import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Crosshair, MapPin, Search, Store } from "lucide-react-native";
import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { CityMap } from "@/components/CityMap";
import { Field, FormSection } from "@/components/Field";
import { useCreatePlace, useSimilarPlaces } from "@/hooks/usePlaces";
import { geocodificar } from "@/lib/geocode";
import { useCity } from "@/providers/CityProvider";
import { PLACE_CATEGORIES, type PlaceCategory } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

const CATEGORY_KEYS = Object.keys(PLACE_CATEGORIES) as PlaceCategory[];

// O aviso de repetido agora alcança a cidade inteira, então a distância pode ser de quilômetros.
const distancia = (m: number) =>
  m >= 1000 ? `${(m / 1000).toFixed(1).replace(".", ",")} km` : `${Math.round(m)} m`;

type Ponto = { lat: number; lng: number };
/** De onde veio o alfinete: GPS, endereço achado ou toque no mapa. */
type Origem = "gps" | "endereco" | "mapa";

function metros(a: Ponto, b: Ponto) {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371000;
}

/** Alert que espera a resposta. */
function perguntar<T extends string>(
  titulo: string,
  texto: string,
  botoes: { label: string; valor: T; cancelar?: boolean }[],
): Promise<T> {
  return new Promise((resolve) =>
    Alert.alert(
      titulo,
      texto,
      botoes.map((b) => ({
        text: b.label,
        style: b.cancelar ? "cancel" : "default",
        onPress: () => resolve(b.valor),
      })),
      { cancelable: false },
    ),
  );
}

export function PlaceForm({ onDone }: { onDone: (placeId: string) => void }) {
  const { city, userLocation } = useCity();
  const router = useRouter();
  const create = useCreatePlace();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("bar");
  const [address, setAddress] = useState("");
  const [point, setPoint] = useState<Ponto | null>(null);
  const [origem, setOrigem] = useState<Origem | null>(null);
  // O texto que virou o ponto atual. Endereço editado depois disso não foi conferido.
  const [enderecoAchado, setEnderecoAchado] = useState<string | null>(null);
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
      setOrigem("gps");
      setEnderecoAchado(null);
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
      setOrigem("endereco");
      setEnderecoAchado(address.trim());
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

  /**
   * Confere o endereço escrito antes de gravar. Aconteceu em 04/10/2026: o Na Feira Bar foi
   * cadastrado com o endereço certo no texto e o alfinete no GPS de quem cadastrou (outro bairro),
   * porque o endereço só virava ponto tocando em "Achar esse endereço no mapa". Agora, endereço
   * escrito e ainda não conferido é buscado no envio; se não bater com o alfinete, a pessoa escolhe.
   * Devolve o ponto que vale, ou null para parar e ajustar.
   */
  async function pontoFinal(): Promise<Ponto | null> {
    const escrito = address.trim();
    if (!city || escrito.length < 4 || escrito === enderecoAchado) return point;
    setAchando(true);
    let achado: Awaited<ReturnType<typeof geocodificar>> = null;
    try {
      achado = await geocodificar(escrito, city);
    } catch {
      achado = null;
    } finally {
      setAchando(false);
    }
    if (!achado) {
      if (origem !== "gps") return point;
      const r = await perguntar(
        "Não achei esse endereço no mapa",
        "O lugar vai ficar onde você está agora. Você está no lugar?",
        [
          { label: "Ajustar o ponto", valor: "ajustar", cancelar: true },
          { label: "Estou no lugar", valor: "ok" },
        ],
      );
      return r === "ok" ? point : null;
    }
    const doEndereco = { lat: achado.lat, lng: achado.lng };
    const d = point ? metros(point, doEndereco) : Infinity;
    if (point && d <= 150) return point;
    let usar: "endereco" | "alfinete" | "ajustar" = "endereco";
    if (point) {
      usar = await perguntar(
        "O endereço e o alfinete não batem",
        `${achado.rotulo}\n\nEsse endereço fica a ${distancia(d)} do alfinete${
          origem === "gps" ? ", que está onde você está agora" : ""
        }. Onde o lugar fica?`,
        [
          { label: "Ajustar", valor: "ajustar", cancelar: true },
          { label: "No alfinete", valor: "alfinete" },
          { label: "No endereço", valor: "endereco" },
        ],
      );
    }
    if (usar === "alfinete") return point;
    // "Ajustar" também leva o mapa até o endereço, para a pessoa ver e mexer.
    setPoint(doEndereco);
    setFoco(doEndereco);
    setRotulo(achado.rotulo);
    setOrigem("endereco");
    setEnderecoAchado(escrito);
    return usar === "endereco" ? doEndereco : null;
  }

  async function submit() {
    if (name.trim().length < 2) return Alert.alert("Falta o nome", "Dê um nome ao lugar.");
    if (!point && address.trim().length < 4)
      return Alert.alert(
        "Falta o local",
        "Escreva o endereço, use sua localização ou toque no mapa.",
      );
    const ponto = await pontoFinal();
    if (!ponto) {
      if (!point) Alert.alert("Falta o local", "Use sua localização ou toque no mapa.");
      return;
    }
    try {
      const id = await create.mutateAsync({
        name,
        category,
        address,
        lat: ponto.lat,
        lng: ponto.lng,
      });
      // Limpa antes de sair: a tela fica montada no fundo (aba escondida), então voltar
      // encontraria o formulário preenchido com o lugar que já foi criado.
      setName("");
      setAddress("");
      setCategory("bar");
      setPoint(null);
      setFoco(null);
      setRotulo(null);
      setOrigem(null);
      setEnderecoAchado(null);
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
      <FormSection label="Nome">
        <Field
          icon={Store}
          placeholder="Ex.: Bar da Esquina"
          maxLength={80}
          value={name}
          onChangeText={setName}
        />
      </FormSection>

      <FormSection label="Categoria">
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
      </FormSection>

      <FormSection label="Endereço" hint="opcional">
        <Field
          icon={MapPin}
          placeholder="Rua e número"
          maxLength={200}
          value={address}
          onChangeText={setAddress}
          onSubmitEditing={acharEndereco}
          returnKeyType="search"
        />
        <SecondaryButton
          label={achando ? "Procurando…" : "Achar esse endereço no mapa"}
          icon={Search}
          color={colors.lilacInk}
          disabled={achando}
          onPress={acharEndereco}
        />
      </FormSection>

      <FormSection
        label="Local"
        note="O alfinete é o que vale: a cidade e o bairro do lugar saem dele, não do endereço escrito."
      >
        <SecondaryButton label="Estou no lugar agora" icon={Crosshair} onPress={useMyLocation} />
        <CityMap
          occurrences={[]}
          center={center}
          zoom={point ? 16 : 12}
          onPick={(p) => {
            setPoint(p);
            setRotulo(null);
            setOrigem("mapa");
          }}
          picked={point}
          focus={foco}
          style={{ height: 260 }}
        />
        {rotulo && (
          <Text className="font-body text-xs text-turquoiseInk">Achei aqui: {rotulo}</Text>
        )}
        {origem === "gps" && address.trim().length >= 4 && address.trim() !== enderecoAchado && (
          <Text className="font-body text-xs text-coralInk">
            O alfinete está onde você está agora. Ao enviar, o endereço escrito é conferido.
          </Text>
        )}
      </FormSection>

      {jaExistem.length > 0 && (
        <View className="gap-3 rounded-3xl bg-surface p-4" style={shadow.card}>
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
              className="rounded-[18px] bg-solid px-4 py-3 active:opacity-70"
              style={shadow.field}
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

      <PrimaryButton
        tone="turquoise"
        label={
          create.isPending ? "Salvando…" : achando ? "Conferindo o endereço…" : "Adicionar lugar"
        }
        disabled={create.isPending || achando}
        onPress={submit}
      />
    </View>
  );
}
