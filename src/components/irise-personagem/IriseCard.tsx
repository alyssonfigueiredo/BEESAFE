import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { IriseAvatar } from "@/components/irise-personagem/IriseAvatar";
import { useProfile } from "@/hooks/useProfile";
import { IRISES, STATS } from "@/lib/irisePersonagens";
import { colors, shadow } from "@/theme/tokens";

/**
 * Cartão do Perfil: o personagem do irise. Avatar saindo por cima (igual ao protótipo aprovado
 * 10/10/2026), com os atributos à mostra — sem XP, sem aparecer em outra tela além daqui e do chat.
 */
export function IriseCard() {
  const { data: profile } = useProfile();
  const atual = IRISES.find((p) => p.n === profile?.irise_personagem);

  function trocar() {
    router.push({
      pathname: "/irise-preview/escolha",
      params: { modo: "perfil", atual: atual ? String(atual.n) : "1", forma: "2" },
    });
  }

  if (!atual) {
    return (
      <View className="flex-row items-center gap-4 rounded-[30px] bg-surface px-6 py-6" style={shadow.card}>
        <View className="h-[56px] w-[56px] items-center justify-center rounded-full bg-subtle">
          <Text className="font-body-bold text-xl text-dim">?</Text>
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-body-medium text-[17px] text-ink">Escolha um irise</Text>
          <Text className="font-body text-[12.5px] leading-[17px] text-dim">
            Um personagem pra te acompanhar no chat da Irise.
          </Text>
        </View>
        <Pressable onPress={trocar} className="rounded-full bg-subtle px-4 py-2.5 active:opacity-70">
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
        <IriseAvatar personagem={atual.n} size={98} />
      </View>
      <View style={{ maxWidth: "62%" }}>
        <Text className="font-body-bold text-[11px] uppercase tracking-[0.1em] text-yellowInk">
          Seu irise · {atual.classe}
        </Text>
        <Text className="mt-1.5 font-display text-[28px] text-ink">{atual.nome.toUpperCase()}</Text>
        <Text className="mt-1 font-body text-[12.5px] text-dim">{atual.pronomes}</Text>
      </View>
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
    </View>
  );
}
