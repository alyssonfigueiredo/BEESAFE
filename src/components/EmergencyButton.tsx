import { Siren, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useFolhaAberta } from "@/hooks/useDiscovery";
import { useSupportServices } from "@/hooks/useSupport";
import { useTourTarget } from "@/hooks/useTour";
import { useCity } from "@/providers/CityProvider";
import { EMERGENCY_CONTACTS } from "@/theme/domain";
import { Glass } from "@/components/Glass";
import { colors } from "@/theme/tokens";

function ligar(numero: string) {
  Linking.openURL(`tel:${numero}`).catch(() =>
    Alert.alert("Não foi possível ligar daqui", `Disque ${numero} manualmente no seu telefone.`),
  );
}

function abrirSite(url: string) {
  Linking.openURL(url).catch(() =>
    Alert.alert("Não deu certo", "Não foi possível abrir o site agora."),
  );
}

export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const pulse = useSharedValue(0);
  const { city } = useCity();
  const { data: services = [] } = useSupportServices(city?.id);
  const local = services.filter((s) => s.city_id != null || s.state != null);
  // Alvo do tour ("Emergência") e folha aberta (a descoberta não aparece por cima dela).
  const tourRef = useTourTarget("sos");
  useFolhaAberta(open);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, [pulse]);

  const ring = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.6 }],
    opacity: 0.6 * (1 - pulse.value),
  }));

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="mr-4 h-10 w-10 items-center justify-center"
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              height: 40,
              width: 40,
              borderRadius: 20,
              backgroundColor: colors.coral,
            },
            ring,
          ]}
        />
        <View
          ref={tourRef}
          collapsable={false}
          className="h-10 w-10 items-center justify-center rounded-full bg-coral"
        >
          <Siren color={colors.night} size={20} />
        </View>
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-night/40">
          {/* Folha em vidro forte: texto longo em cima de blur precisa de véu mais fechado. */}
          <Glass tint="strong" style={styles.pane}>
            <View className="flex-row items-center justify-between">
              <Text className="font-display text-2xl uppercase tracking-wide text-ink">
                Emergência
              </Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={12}>
                <X color={colors.muted} size={24} />
              </Pressable>
            </View>
            {EMERGENCY_CONTACTS.map((c) => (
              <Pressable
                key={c.number}
                onPress={() => ligar(c.number)}
                className="flex-row items-center gap-4 rounded-2xl px-4 py-3 active:opacity-80"
                style={styles.row}
              >
                <Text className="w-16 font-display text-3xl text-ink">{c.number}</Text>
                <View className="flex-1">
                  <Text className="font-body-bold text-base text-ink">{c.name}</Text>
                  <Text className="font-body text-sm text-dim">{c.note}</Text>
                </View>
              </Pressable>
            ))}
            {local.length > 0 && (
              <View className="gap-2">
                <Text className="font-body-bold text-sm text-turquoiseInk">
                  Apoio em {city?.name}
                </Text>
                {local.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => (s.phone ? ligar(s.phone) : abrirSite(s.url ?? ""))}
                    disabled={!s.phone && !s.url}
                    className="rounded-2xl px-4 py-3 active:opacity-80"
                    style={styles.row}
                  >
                    <Text className="font-body-bold text-sm text-ink">{s.name}</Text>
                    {!!s.description && (
                      <Text className="font-body text-xs text-dim">{s.description}</Text>
                    )}
                    {!!s.phone && (
                      <Text className="font-body-bold text-sm text-coralInk">{s.phone}</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </Glass>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: "rgba(255,255,255,0.55)" },
  pane: {
    gap: 16,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 44,
  },
});
