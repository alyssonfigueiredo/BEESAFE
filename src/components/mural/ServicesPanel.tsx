import { ExternalLink, Phone } from "lucide-react-native";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";

import type { SupportService } from "@/hooks/useSupport";
import { EMERGENCY_CONTACTS } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

const KIND: Record<SupportService["kind"], { label: string; color: string; ink: string }> = {
  policia: { label: "Polícia", color: colors.coral, ink: colors.coralInk },
  saude: { label: "Saúde", color: colors.turquoise, ink: colors.turquoiseInk },
  direitos: { label: "Direitos humanos", color: colors.lilac, ink: colors.lilacInk },
  acolhimento: { label: "Acolhimento", color: colors.turquoise, ink: colors.turquoiseInk },
  ong: { label: "ONG", color: colors.lilac, ink: colors.lilacInk },
  juridico: { label: "Jurídico", color: colors.yellow, ink: colors.yellowInk },
};

function abrir(url: string, aviso: string) {
  Linking.openURL(url).catch(() => Alert.alert("Não deu certo", aviso));
}

function ligar(numero: string) {
  abrir(`tel:${numero}`, `Não foi possível ligar daqui. Disque ${numero} manualmente.`);
}

function rise(i: number, reduce: boolean) {
  return reduce
    ? undefined
    : FadeInDown.duration(360)
        .delay(Math.min(i, 8) * 50)
        .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] });
}

/** Aba Serviços do Apoio: os quatro números de agora e os serviços da cidade. */
export function ServicesPanel({
  services,
  cityName,
}: {
  services: SupportService[];
  cityName?: string;
}) {
  const reduce = useReducedMotion();
  const local = services.filter((s) => s.city_id != null || s.state != null);
  const national = services.filter((s) => s.city_id == null && s.state == null);

  return (
    <View className="gap-3">
      <Animated.Text
        entering={rise(0, reduce)}
        className="mt-1 font-body-bold text-xs uppercase tracking-[1.6px] text-dim"
      >
        Agora
      </Animated.Text>
      <Animated.View entering={rise(1, reduce)} className="flex-row flex-wrap gap-2">
        {EMERGENCY_CONTACTS.map((c) => (
          <Pressable
            key={c.number}
            onPress={() => ligar(c.number)}
            className="gap-0.5 rounded-[20px] bg-solid px-3.5 py-3 active:opacity-80"
            style={[{ width: "47%", flexGrow: 1 }, shadow.card]}
            accessibilityRole="button"
            accessibilityLabel={`Ligar ${c.number}, ${c.name}`}
          >
            <Text className="font-display text-[26px] leading-[30px] text-coralInk">
              {c.number}
            </Text>
            <Text className="font-body-bold text-xs text-ink" numberOfLines={1}>
              {c.name}
            </Text>
            <Text className="font-body text-xs text-muted" numberOfLines={1}>
              {c.note}
            </Text>
          </Pressable>
        ))}
      </Animated.View>

      {local.length > 0 && (
        <Animated.Text
          entering={rise(2, reduce)}
          className="mt-1 font-body-bold text-xs uppercase tracking-[1.6px] text-dim"
        >
          {cityName ? `Em ${cityName}` : "Perto de você"}
        </Animated.Text>
      )}
      {local.map((s, i) => (
        <ServiceCard key={s.id} s={s} index={i + 3} reduce={reduce} />
      ))}

      {national.length > 0 && (
        <Animated.Text
          entering={rise(local.length + 3, reduce)}
          className="mt-1 font-body-bold text-xs uppercase tracking-[1.6px] text-dim"
        >
          No Brasil todo
        </Animated.Text>
      )}
      {national.map((s, i) => (
        <ServiceCard key={s.id} s={s} index={local.length + 4 + i} reduce={reduce} />
      ))}

      {services.length === 0 && (
        <Text className="font-body text-sm text-muted">
          Ainda não temos serviços cadastrados {cityName ? `em ${cityName}` : "aqui"}. Os números de
          cima funcionam no Brasil todo.
        </Text>
      )}
    </View>
  );
}

function ServiceCard({ s, index, reduce }: { s: SupportService; index: number; reduce: boolean }) {
  const k = KIND[s.kind] ?? KIND.acolhimento;
  return (
    <Animated.View
      entering={rise(index, reduce)}
      className="gap-1.5 rounded-[20px] bg-solid p-3.5"
      style={{ boxShadow: "0 1px 2px rgba(20,24,41,0.05)" }}
    >
      <View className="flex-row items-start justify-between gap-2">
        <Text className="min-w-0 flex-1 font-body-bold text-[15px] text-ink">{s.name}</Text>
        <View
          className="h-6 justify-center rounded-full px-2.5"
          style={{ backgroundColor: k.color + "2E" }}
        >
          <Text className="font-body-bold text-[11px]" style={{ color: k.ink }}>
            {k.label}
          </Text>
        </View>
      </View>
      {!!s.description && (
        <Text className="font-body text-[12.5px] leading-[18px] text-muted">{s.description}</Text>
      )}
      {(!!s.url || !!s.phone) && (
        <View className="mt-1 flex-row flex-wrap gap-2">
          {!!s.url && (
            <Pressable
              onPress={() => abrir(s.url!, "Não foi possível abrir o site agora.")}
              className="h-8 flex-row items-center gap-1.5 rounded-full px-3 active:opacity-70"
              style={{ backgroundColor: colors.subtle }}
            >
              <ExternalLink size={13} color={colors.turquoiseInk} />
              <Text className="font-body-bold text-[12.5px] text-ink">Site</Text>
            </Pressable>
          )}
          {!!s.phone && (
            <Pressable
              onPress={() => ligar(s.phone!)}
              className="h-8 flex-row items-center gap-1.5 rounded-full px-3 active:opacity-70"
              style={{ backgroundColor: colors.subtle }}
              accessibilityLabel={`Ligar ${s.phone}`}
            >
              <Phone size={13} color={colors.coralInk} />
              <Text className="font-body-bold text-[12.5px] text-ink">Ligar · {s.phone}</Text>
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
}
