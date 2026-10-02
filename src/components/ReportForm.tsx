import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as Location from "expo-location";
import { Crosshair } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";

import { Chip } from "@/components/Chip";
import { CityMap } from "@/components/CityMap";
import { PlacePicker, type PickedPlace } from "@/components/PlacePicker";
import { useCreateOccurrence } from "@/hooks/useCreateOccurrence";
import { useCity } from "@/providers/CityProvider";
import {
  DAY_PERIODS,
  OCCURRENCE_SETTINGS,
  OCCURRENCE_TYPES,
  SEVERITIES,
  type DayPeriod,
  type OccurrenceSetting,
  type OccurrenceType,
  type Severity,
} from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

const TYPE_KEYS = Object.keys(OCCURRENCE_TYPES) as OccurrenceType[];
const SEV_KEYS = Object.keys(SEVERITIES) as Severity[];
const SETTING_KEYS = Object.keys(OCCURRENCE_SETTINGS) as OccurrenceSetting[];
const PERIOD_KEYS = Object.keys(DAY_PERIODS) as DayPeriod[];

export function ReportForm({ onDone }: { onDone: () => void }) {
  const { city, userLocation } = useCity();
  const create = useCreateOccurrence();
  const [type, setType] = useState<OccurrenceType>("verbal");
  const [severity, setSeverity] = useState<Severity>("media");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState<PickedPlace>(null);
  // Começam vazios e assim podem ficar: são opcionais, e um toque a mais no pior momento da
  // vida de alguém é atrito que não vale o dado.
  const [setting, setSetting] = useState<OccurrenceSetting | null>(null);
  const [period, setPeriod] = useState<DayPeriod | null>(null);
  // `foco` leva a câmera ao ponto do GPS; toque no mapa não mexe nela.
  const [foco, setFoco] = useState<{ lat: number; lng: number } | null>(null);

  async function useMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted")
        return Alert.alert("Sem permissão de localização", "Toque no mapa para marcar o ponto.");
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPoint(p);
      setFoco(p);
      setPlace(null);
    } catch {
      Alert.alert(
        "Não consegui sua localização",
        "Confira se a localização do celular está ligada, ou toque no mapa para marcar o ponto.",
      );
    }
  }

  async function submit() {
    if (!point)
      return Alert.alert(
        "Falta o local",
        "Use sua localização ou toque no mapa para marcar o ponto.",
      );
    try {
      await create.mutateAsync({
        type,
        severity,
        description,
        lat: point.lat,
        lng: point.lng,
        occurrence_date: format(date, "yyyy-MM-dd"),
        place_id: place?.id ?? null,
        setting,
        period,
      });
      Alert.alert(
        "Relato registrado",
        "Obrigado. Ele já aparece no mapa, sem nenhuma identificação sua.",
      );
      // Limpa antes de sair: a aba fica montada no fundo e voltaria com o relato anterior.
      setType("verbal");
      setSeverity("media");
      setDate(new Date());
      setPoint(null);
      setFoco(null);
      setDescription("");
      setPlace(null);
      setSetting(null);
      setPeriod(null);
      onDone();
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
      <Field label="Tipo">
        <View className="flex-row flex-wrap gap-2">
          {TYPE_KEYS.map((k) => (
            <Chip
              key={k}
              label={OCCURRENCE_TYPES[k].label}
              color={OCCURRENCE_TYPES[k].color}
              active={type === k}
              onPress={() => setType(k)}
            />
          ))}
        </View>
      </Field>

      <Field label="Data">
        {Platform.OS === "android" && (
          <Pressable
            onPress={() => setShowPicker(true)}
            className="rounded-2xl bg-solid px-4 py-3"
            style={shadow.field}
          >
            <Text className="font-body text-base text-ink">
              {format(date, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Text>
          </Pressable>
        )}
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            maximumDate={new Date()}
            display={Platform.OS === "ios" ? "compact" : "default"}
            themeVariant="light"
            onChange={(_, d) => {
              if (Platform.OS === "android") setShowPicker(false);
              if (d) setDate(d);
            }}
          />
        )}
      </Field>

      <Field label="Gravidade">
        <View className="flex-row gap-2">
          {SEV_KEYS.map((k) => (
            <Chip
              key={k}
              label={SEVERITIES[k].label}
              color={SEVERITIES[k].color}
              active={severity === k}
              onPress={() => setSeverity(k)}
              grow
            />
          ))}
        </View>
      </Field>

      <Field
        label="Local"
        hint="Use sua localização ou toque no mapa. O bairro é identificado automaticamente."
      >
        <Pressable
          onPress={useMyLocation}
          className="flex-row items-center justify-center gap-2 rounded-full bg-turquoise/20 py-3 active:opacity-80"
        >
          <Crosshair color={colors.turquoiseInk} size={18} />
          <Text className="font-body-bold text-sm text-turquoiseInk">Usar minha localização</Text>
        </Pressable>
        <CityMap
          occurrences={[]}
          center={center}
          zoom={point ? 15 : 12}
          onPick={(p) => {
            setPoint(p);
            setPlace(null);
          }}
          picked={point}
          focus={foco}
          style={{ height: 260 }}
        />
        <Text className="font-body text-xs text-dim">
          {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Nenhum ponto marcado"}
        </Text>
      </Field>

      <Field
        label="Onde foi"
        hint="opcional — ajuda a ler o mapa (“nessa praça”, “nesse ponto de ônibus”)"
      >
        <View className="flex-row flex-wrap gap-2">
          {SETTING_KEYS.map((k) => (
            <Chip
              key={k}
              label={OCCURRENCE_SETTINGS[k].label}
              color={OCCURRENCE_SETTINGS[k].color}
              active={setting === k}
              onPress={() => setSetting(setting === k ? null : k)}
            />
          ))}
        </View>
      </Field>

      <Field label="Quando foi" hint="opcional — muita violência tem hora">
        <View className="flex-row gap-2">
          {PERIOD_KEYS.map((k) => (
            <Chip
              key={k}
              label={DAY_PERIODS[k].label}
              color={DAY_PERIODS[k].color}
              active={period === k}
              onPress={() => setPeriod(period === k ? null : k)}
              grow
            />
          ))}
        </View>
      </Field>

      {point && (
        <Field label="Foi em um lugar cadastrado?" hint="opcional">
          <PlacePicker point={point} value={place} onChange={setPlace} />
        </Field>
      )}

      <Field label="Descrição (opcional)" hint={`${description.length}/2000`}>
        <TextInput
          className="min-h-28 rounded-2xl bg-solid px-4 py-3 font-body text-base text-ink"
          style={shadow.field}
          placeholder="O que aconteceu? Não inclua seu nome nem dados que identifiquem você ou outras pessoas."
          placeholderTextColor={colors.dim}
          multiline
          textAlignVertical="top"
          maxLength={2000}
          value={description}
          onChangeText={setDescription}
        />
      </Field>

      <Pressable
        disabled={create.isPending}
        onPress={submit}
        className="items-center rounded-full bg-coral py-4 active:opacity-80 disabled:opacity-50"
        style={shadow.coral}
      >
        <Text className="font-body-bold text-base text-night">
          {create.isPending ? "Enviando…" : "Registrar relato"}
        </Text>
      </Pressable>
    </View>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between">
        <Text className="font-body-bold text-xs text-muted">{label}</Text>
        {hint && <Text className="font-body text-xs text-dim">{hint}</Text>}
      </View>
      {children}
    </View>
  );
}
