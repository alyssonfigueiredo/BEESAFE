import { formatDistanceToNow, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { router, Stack } from "expo-router";
import { Check, Map as MapIcon, Navigation } from "lucide-react-native";
import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Aurora } from "@/components/Aurora";
import { HeartIcon } from "@/components/FavHeart";
import { FadeUp } from "@/components/gami/Anim";
import { PlaceCard } from "@/components/PlaceCard";
import { Segmented } from "@/components/Segmented";
import { useFavoritos, useLugaresFavoritos } from "@/hooks/useFavoritos";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { distanceMeters } from "@/lib/geo";
import type { PublicPlace } from "@/lib/types";
import { useCity } from "@/providers/CityProvider";
import { colors, shadow } from "@/theme/tokens";

// Quero ir (migration 65): a lista que só a pessoa vê. "Quero ir" são os salvos ainda não
// avaliados; "Já fui", os que ela avaliou depois de salvar (o banco muda sozinho).

type Aba = "quero" | "fui";

function comoChegar(p: PublicPlace) {
  const url = Platform.select({
    ios: `maps://?daddr=${p.latitude},${p.longitude}&q=${encodeURIComponent(p.name)}`,
    default: `geo:${p.latitude},${p.longitude}?q=${p.latitude},${p.longitude}(${encodeURIComponent(p.name)})`,
  });
  Linking.openURL(url).catch(() =>
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`,
    ),
  );
}

function Acao({
  label,
  icon,
  color,
  bg,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="h-9 flex-row items-center gap-1.5 rounded-full px-3.5 active:opacity-80"
      style={{ backgroundColor: bg }}
    >
      {icon}
      <Text className="font-body-bold text-[13px]" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function QueroIrScreen() {
  const insets = useScreenInsets({ tabs: false });
  const { userLocation } = useCity();
  const { data: favs } = useFavoritos();
  const { data: itens = [], isLoading } = useLugaresFavoritos();
  const [aba, setAba] = useState<Aba>("quero");

  const dist = (p: PublicPlace) =>
    userLocation ? distanceMeters(userLocation, { lat: p.latitude, lng: p.longitude }) : null;
  const quero = itens
    .filter((i) => !i.visitado_em)
    .sort((a, b) => (dist(a.place) ?? 0) - (dist(b.place) ?? 0));
  const fui = itens
    .filter((i) => i.visitado_em)
    .sort((a, b) => (b.visitado_em ?? "").localeCompare(a.visitado_em ?? ""));
  const nQuero = (favs ?? []).filter((f) => !f.visitado_em).length;
  const nFui = (favs ?? []).filter((f) => f.visitado_em).length;
  const lista = aba === "quero" ? quero : fui;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackTitle: "Voltar",
          title: "",
          headerTransparent: true,
          headerStyle: { backgroundColor: "transparent" },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
        }}
      />
      <View className="flex-1">
        <Aurora />
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 px-4"
          contentContainerStyle={insets}
        >
          <FadeUp>
            <View className="flex-row items-center gap-2.5">
              <HeartIcon on size={34} />
              <Text className="font-display text-[34px] uppercase leading-[40px] text-ink">
                Quero ir
              </Text>
            </View>
            <Text className="font-body text-[14px] text-dim">Só você vê essa lista.</Text>
          </FadeUp>

          <Segmented
            options={[
              { key: "quero", label: `Quero ir · ${nQuero}` },
              { key: "fui", label: `Já fui · ${nFui}` },
            ]}
            value={aba}
            onChange={setAba}
          />

          {aba === "quero" && quero.length > 0 && (
            <Pressable
              onPress={() =>
                router.navigate({
                  pathname: "/mapa",
                  params: { camada: "quero", t: String(Date.now()) },
                })
              }
              className="h-11 flex-row items-center justify-center gap-2 rounded-full bg-solid active:opacity-80"
              style={shadow.card}
            >
              <MapIcon color={colors.ink} size={17} strokeWidth={2.2} />
              <Text className="font-body-bold text-[14px] text-ink">Ver no mapa</Text>
            </Pressable>
          )}

          {lista.map((i, k) => (
            <View key={i.place_id} className="gap-2">
              <PlaceCard place={i.place} distance={dist(i.place)} index={k} />
              {aba === "quero" ? (
                <View className="flex-row gap-2 px-1">
                  <Acao
                    label="Como chegar"
                    icon={<Navigation color={colors.ink} size={14} strokeWidth={2.4} />}
                    color={colors.ink}
                    bg={colors.solid}
                    onPress={() => comoChegar(i.place)}
                  />
                  <Acao
                    label="Já fui · avaliar"
                    icon={<Check color={colors.turquoiseInk} size={14} strokeWidth={2.6} />}
                    color={colors.turquoiseInk}
                    bg="rgba(73,220,192,0.2)"
                    onPress={() =>
                      router.push({
                        pathname: "/lugar/[id]",
                        params: { id: i.place_id, avaliar: "1" },
                      })
                    }
                  />
                </View>
              ) : (
                <Text className="px-2 font-body text-[12.5px] text-turquoiseInk">
                  Avaliado{" "}
                  {formatDistanceToNow(parseISO(i.visitado_em!), { addSuffix: true, locale: ptBR })}
                </Text>
              )}
            </View>
          ))}

          {!isLoading && lista.length === 0 && (
            <FadeUp style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 16 }}>
              <HeartIcon on={false} size={60} />
              <Text className="mt-3 text-center font-display text-[24px] uppercase leading-[29px] text-ink">
                {aba === "quero" ? "Nada salvo ainda" : "Ninguém por aqui ainda"}
              </Text>
              <Text className="mt-1.5 text-center font-body text-[14px] leading-[21px] text-muted">
                {aba === "quero"
                  ? "Toque no coração de qualquer lugar para guardar aqui os que você quer conhecer."
                  : "Quando você avaliar um lugar da lista, ele aparece aqui."}
              </Text>
              {aba === "quero" && (
                <Pressable
                  onPress={() => router.navigate("/lugares")}
                  className="mt-4 h-11 items-center justify-center rounded-full px-6 active:opacity-80"
                  style={{ backgroundColor: colors.night }}
                >
                  <Text className="font-body-bold text-[14px] text-paper">Ver lugares</Text>
                </Pressable>
              )}
            </FadeUp>
          )}

          {aba === "quero" && quero.length > 0 && (
            <Text className="px-1 font-body text-[12.5px] leading-[18px] text-dim">
              Avaliou um lugar da lista? Ele passa sozinho para Já fui.
            </Text>
          )}
        </ScrollView>
      </View>
    </>
  );
}
