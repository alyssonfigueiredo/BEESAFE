import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as Location from "expo-location";
import { Crosshair } from "lucide-react-native";
import { useState } from "react";
import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";

import { CityMap } from "@/components/CityMap";
import { useCreateOccurrence } from "@/hooks/useCreateOccurrence";
import { useCity } from "@/providers/CityProvider";
import {
  OCCURRENCE_TYPES,
  onLight,
  SEVERITIES,
  type OccurrenceType,
  type Severity,
} from "@/theme/domain";
import { colors } from "@/theme/tokens";

const TYPE_KEYS = Object.keys(OCCURRENCE_TYPES) as OccurrenceType[];
const SEV_KEYS = Object.keys(SEVERITIES) as Severity[];

export function ReportForm({ onDone }: { onDone: () => void }) {
  const { city, userLocation } = useCity();
  const create = useCreateOccurrence();
  const [type, setType] = useState<OccurrenceType>("verbal");
  const [severity, setSeverity] = useState<Severity>("media");
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === "ios");
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [description, setDescription] = useState("");

  async function useMyLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Sem permissão de localização", "Toque no mapa para marcar o ponto.");
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
      });
      Alert.alert(
        "Relato registrado",
        "Obrigado. Ele já aparece no mapa, sem nenhuma identificação sua.",
      );
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
            <Choice
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
            className="rounded-xl border border-border bg-surface px-4 py-3"
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
            themeVariant="dark"
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
            <Choice
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
          className="flex-row items-center justify-center gap-2 rounded-xl border border-turquoise py-3 active:opacity-80"
        >
          <Crosshair color={colors.turquoiseInk} size={18} />
          <Text className="font-heading text-sm uppercase tracking-widest text-turquoiseInk">
            Usar minha localização
          </Text>
        </Pressable>
        <CityMap
          occurrences={[]}
          center={center}
          zoom={point ? 15 : 12}
          onPick={setPoint}
          picked={point}
          style={{ height: 260 }}
        />
        <Text className="font-body text-xs text-dim">
          {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "Nenhum ponto marcado"}
        </Text>
      </Field>

      <Field label="Descrição (opcional)" hint={`${description.length}/2000`}>
        <TextInput
          className="min-h-28 rounded-xl border border-border bg-surface px-4 py-3 font-body text-base text-ink"
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
        className="items-center rounded-xl bg-coral py-4 active:opacity-80 disabled:opacity-50"
      >
        <Text className="font-heading text-lg uppercase tracking-widest text-night">
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
        <Text className="font-heading text-sm uppercase tracking-widest text-muted">{label}</Text>
        {hint && <Text className="font-body text-xs text-dim">{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function Choice({
  label,
  color,
  active,
  onPress,
  grow,
}: {
  label: string;
  color: string;
  active: boolean;
  onPress: () => void;
  grow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`items-center rounded-full border px-3 py-2 ${grow ? "flex-1" : ""}`}
      style={{ borderColor: color, backgroundColor: active ? color : "transparent" }}
    >
      <Text
        className="font-body-medium text-xs"
        style={{ color: active ? colors.night : onLight(color) }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
