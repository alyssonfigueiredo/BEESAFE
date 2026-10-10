import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { IriseAvatar } from "@/components/irise-personagem/IriseAvatar";
import { AnelArcoIris, IriseSheet } from "@/components/irise/Irise";
import { useAppConfig, useForma } from "@/hooks/useGamification";
import { useIrisePersonagens } from "@/hooks/useIrisePersonagens";
import { useProfile } from "@/hooks/useProfile";
import { STATS } from "@/lib/irisePersonagens";
import { useCity } from "@/providers/CityProvider";
import { colors, shadow } from "@/theme/tokens";

/**
 * Abre o carrossel de escolha (Perfil → "Escolher"/"Trocar irise", ou o convite da Início sem
 * personagem ainda) — compartilhado pra não duplicar a navegação em mais de um lugar.
 * `primeiraVez`: depois de salvar, mostra a apresentação do irise em vez de só voltar calado.
 */
export function abrirEscolhaIrise({
  atual,
  forma,
  primeiraVez,
}: {
  atual: number | null;
  forma: number;
  primeiraVez: boolean;
}) {
  router.push({
    pathname: "/irise-preview/escolha",
    params: {
      modo: "perfil",
      atual: atual != null ? String(atual) : "1",
      forma: String(forma),
      primeiraVez: primeiraVez ? "1" : "",
    },
  });
}

/**
 * Cartão do Perfil: o personagem do irise. Avatar saindo por cima (igual ao protótipo aprovado
 * 10/10/2026), com os atributos à mostra — sem XP, sem aparecer em outra tela além daqui e do chat.
 */
const AVATAR = 98;

export function IriseCard() {
  const { data: cfg } = useAppConfig();
  const { data: profile } = useProfile();
  const { data: irises = [] } = useIrisePersonagens();
  const forma = useForma();
  const { city, userLocation } = useCity();
  const [chatAberta, setChatAberta] = useState(false);
  const atual = irises.find((p) => p.n === profile?.irise_personagem);

  if (!cfg?.irise_ativa) return null;

  function trocar() {
    abrirEscolhaIrise({ atual: atual?.n ?? null, forma, primeiraVez: !atual });
  }

  if (!atual) {
    return (
      <View className="flex-row items-center gap-4 rounded-[30px] bg-surface px-6 py-6" style={shadow.card}>
        <View style={{ width: 56, height: 56 }}>
          <AnelArcoIris size={56} />
          <View
            style={{ position: "absolute", inset: 3, borderRadius: 25, backgroundColor: colors.subtle }}
            className="items-center justify-center"
          >
            <Text className="font-body-bold text-xl" style={{ color: colors.ink }}>
              ?
            </Text>
          </View>
        </View>
        <View className="gap-0.5" style={{ flex: 1, minWidth: 0 }}>
          <Text className="font-body-medium text-[17px] text-ink">Escolha um irise</Text>
          <Text className="font-body text-[12.5px] leading-[17px] text-dim">
            Um personagem pra te acompanhar no app.
          </Text>
        </View>
        <Pressable
          onPress={trocar}
          className="rounded-full bg-subtle px-4 py-2.5 active:opacity-70"
          style={{ flexShrink: 0 }}
        >
          <Text className="font-body-bold text-[13px] text-ink">Escolher</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View
      className="rounded-[30px] bg-surface px-6 pb-5 pt-6"
      style={[shadow.card, { marginTop: 40 }]}
    >
      <View style={{ position: "absolute", right: 18, top: -34 }}>
        <IriseAvatar personagem={atual.n} size={AVATAR} />
      </View>
      <View style={{ paddingRight: AVATAR - 16 }}>
        <Text
          numberOfLines={1}
          className="font-body-bold text-[11px] uppercase tracking-[0.1em] text-yellowInk"
        >
          Seu irise · {atual.classe}
        </Text>
        <Text className="mt-1.5 font-display text-[28px] text-ink">{atual.nome}</Text>
        <Text className="mt-1 font-body text-[12.5px] text-dim">{atual.pronomes}</Text>
      </View>
      <Pressable
        onPress={() => setChatAberta(true)}
        hitSlop={{ top: 4, bottom: 4 }}
        className="mt-3 h-9 flex-row items-center justify-center self-start rounded-full bg-turquoise px-4 active:opacity-80"
      >
        <Text className="font-body-bold text-sm text-night">Conversar com {atual.nome}</Text>
      </Pressable>
      <View className="mt-3.5 flex-row flex-wrap gap-x-5 gap-y-2.5">
        {STATS.map((s, i) => (
          <View key={s.key} style={{ width: "44%" }}>
            <Text className="mb-1 font-body-bold text-[10px] uppercase tracking-[0.06em] text-dim">
              {s.label}
            </Text>
            <View className="flex-row gap-[3px]">
              {Array.from({ length: 5 }).map((_, seg) => (
                <View
                  key={seg}
                  className="h-[6px] flex-1 rounded-full"
                  style={{ backgroundColor: seg < atual.stats[i] ? s.color : colors.border }}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
      <Pressable onPress={trocar} className="mt-4 self-start rounded-full bg-subtle px-4 py-2.5 active:opacity-70">
        <Text className="font-body-bold text-[13px] text-ink">Trocar irise</Text>
      </Pressable>
      <IriseSheet
        visible={chatAberta}
        onClose={() => setChatAberta(false)}
        cityId={city?.id}
        cityName={city?.name}
        userLocation={userLocation}
        personagem={atual.n}
      />
    </View>
  );
}
