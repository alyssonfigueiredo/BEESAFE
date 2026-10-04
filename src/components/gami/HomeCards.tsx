import { router, type Href } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { BoxModal } from "@/components/gami/BoxModal";
import { MedalView } from "@/components/gami/MedalView";
import { SliceRing, WeekRing } from "@/components/gami/Rings";
import { quaseLa, useAppConfig, useGamification } from "@/hooks/useGamification";
import { getMedalha, nomeDa } from "@/lib/medals";
import { colors, shadow } from "@/theme/tokens";

// Cartões novos do Início, logo abaixo do painel da cidade. O painel e o resto da tela não mudam.

function semanaTexto(dias: number, extra: number, caixinhas: number) {
  if (dias >= 4) {
    if (extra > 0)
      return `Semana acesa. ${extra} dia${extra > 1 ? "s" : ""} a mais, ${extra} faísca${extra > 1 ? "s" : ""} extra.`;
    return caixinhas > 0 ? "Semana acesa. Sua caixinha chegou." : "Semana acesa.";
  }
  const falta = 4 - dias;
  return `Mais ${falta} dia${falta > 1 ? "s" : ""} com a Irisa aberta e a semana acende.`;
}

export function AvisoCard() {
  const { data } = useAppConfig();
  const [fechado, setFechado] = useState(false);
  const a = data?.aviso;
  if (!a?.ativo || fechado || !(a.titulo || a.texto)) return null;
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Pressable
        onPress={() => a.url && router.push(a.url as Href)}
        className="flex-row items-start gap-3 rounded-3xl bg-surface p-4"
        style={shadow.card}
      >
        <View
          className="mt-1.5 h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: colors.coral }}
        />
        <View className="min-w-0 flex-1 gap-0.5">
          {!!a.titulo && <Text className="font-body-bold text-[15px] text-ink">{a.titulo}</Text>}
          {!!a.texto && (
            <Text className="font-body text-[13px] leading-[18px] text-muted">{a.texto}</Text>
          )}
        </View>
        <Pressable onPress={() => setFechado(true)} hitSlop={10} accessibilityLabel="Fechar aviso">
          <X color={colors.dim} size={16} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export function GamiHomeCards() {
  const { data: g } = useGamification();
  const [caixa, setCaixa] = useState(false);
  if (!g) return null;
  const quase = quaseLa(g);
  const qm = quase ? getMedalha(quase.id) : null;
  const cidade = g.cidade && g.cidade.total > 0 ? g.cidade : null;

  return (
    <View className="gap-3">
      <View className="flex-row gap-2.5">
        <Animated.View entering={FadeInDown.duration(420)} className="flex-1">
          <Pressable
            onPress={() => g.caixinhas > 0 && setCaixa(true)}
            className="flex-1 gap-2.5 rounded-3xl bg-surface p-3.5"
            style={[shadow.card, g.semana.acesa && { borderWidth: 2, borderColor: colors.lilac }]}
          >
            <View className="flex-row items-center gap-2.5">
              <WeekRing dias={Math.min(4, g.semana.dias)} />
              <View>
                <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
                  Sua semana
                </Text>
                <Text className="font-display text-[22px] text-ink">
                  {Math.min(4, g.semana.dias)} de 4
                </Text>
              </View>
            </View>
            <Text className="font-body text-[12.5px] leading-[17px] text-muted">
              {semanaTexto(g.semana.dias, g.semana.extra, g.caixinhas)}
            </Text>
          </Pressable>
        </Animated.View>
        {cidade && (
          <Animated.View entering={FadeInDown.duration(420).delay(80)} className="flex-1">
            <View className="flex-1 gap-2.5 rounded-3xl bg-surface p-3.5" style={shadow.card}>
              <View className="flex-row items-center gap-2.5">
                <SliceRing lit={cidade.com_selo} n={cidade.total} inner={34} gap={0.8} />
                <View>
                  <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
                    Sua cidade
                  </Text>
                  <Text className="font-display text-[22px] text-ink" numberOfLines={1}>
                    {cidade.com_selo} de {cidade.total}
                  </Text>
                </View>
              </View>
              <Text className="font-body text-[12.5px] leading-[17px] text-muted">
                {cidade.semana > 0
                  ? `dos mais conhecidos já têm selo. ${cidade.semana} esta semana.`
                  : "dos lugares mais conhecidos já têm selo."}
              </Text>
            </View>
          </Animated.View>
        )}
      </View>

      {g.caixinhas > 0 && (
        <Animated.View entering={FadeInDown.duration(420).delay(120)}>
          <Pressable
            onPress={() => setCaixa(true)}
            className="flex-row items-center gap-3 rounded-3xl p-4"
            style={[{ backgroundColor: colors.night }, shadow.lift]}
          >
            <Text className="flex-1 font-body-bold text-[15px] text-paper">
              {g.caixinhas > 1 ? `${g.caixinhas} caixinhas chegaram` : "Sua caixinha chegou"}
            </Text>
            <View className="rounded-full bg-yellow px-4 py-2">
              <Text className="font-body-bold text-[13px] text-night">Abrir</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}

      {quase && qm && (
        <Animated.View entering={FadeInDown.duration(420).delay(160)}>
          <Pressable
            onPress={() => router.push("/pulseira")}
            className="flex-row items-center gap-3.5 rounded-3xl bg-surface px-4 py-3"
            style={shadow.card}
          >
            <MedalView
              id={quase.id}
              size={58}
              on={false}
              prog={quase.valor / quase.alvo}
              lockIcon={false}
            />
            <View className="min-w-0 flex-1">
              <Text
                className="font-body-medium text-[11px] uppercase tracking-wider"
                style={{ color: colors.coralInk }}
              >
                Quase lá
              </Text>
              <Text className="font-body-bold text-[15px] text-ink">{nomeDa(qm, g.forma)}</Text>
              <Text className="font-body text-[13px] text-muted">
                {quase.valor} de {quase.alvo}
              </Text>
            </View>
            <View className="rounded-full bg-subtle px-3.5 py-1.5">
              <Text className="font-body-bold text-[13px] text-ink">Ver</Text>
            </View>
          </Pressable>
        </Animated.View>
      )}

      <BoxModal visible={caixa} onClose={() => setCaixa(false)} />
    </View>
  );
}
