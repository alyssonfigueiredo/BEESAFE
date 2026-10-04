import { router, type Href } from "expo-router";
import { ChevronRight, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Counter, FadeUp, LiveDot, ProgressEdge, Segs } from "@/components/gami/Anim";
import { BoxModal } from "@/components/gami/BoxModal";
import { BAIRROS_META, CoresSheet } from "@/components/gami/CoresSheet";
import { AnimatedMedal } from "@/components/gami/MedalView";
import { SliceRing, WeekRing } from "@/components/gami/Rings";
import { WeekSheet } from "@/components/gami/WeekSheet";
import {
  convitesDaCidade,
  faltam,
  quaseLa,
  unidadeTexto,
  useAppConfig,
  useCityTopPlaces,
  useGamification,
  useMinhasCores,
} from "@/hooks/useGamification";
import { getMedalha, nomeDa } from "@/lib/medals";
import { useCity } from "@/providers/CityProvider";
import { RATING_MIN } from "@/theme/domain";
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
  const [folha, setFolha] = useState<"semana" | "cores" | null>(null);
  if (!g) return null;
  const quase = quaseLa(g);
  const qm = quase ? getMedalha(quase.id) : null;
  const dias = Math.min(4, g.semana.dias);

  return (
    <View className="gap-3">
      <View className="flex-row gap-2.5">
        <FadeUp style={{ flex: 1, minWidth: 0 }}>
          <Pressable
            onPress={() => setFolha("semana")}
            className="gap-2.5 rounded-3xl bg-surface p-3.5 active:opacity-90"
            style={[{ flexGrow: 1 }, shadow.card]}
            accessibilityRole="button"
            accessibilityLabel={`Sua semana: ${dias} de 4 dias. Ver os dias.`}
          >
            <ProgressEdge frac={dias / 4} radius={24} duration={1300} glow={dias >= 4} />
            <View className="flex-row items-center gap-2.5">
              <WeekRing dias={dias} animate delay={200} />
              <View className="min-w-0 flex-1">
                <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
                  Sua semana
                </Text>
                <View className="flex-row items-center">
                  <Counter
                    value={dias}
                    duration={800}
                    delay={200}
                    className="font-display text-[22px] text-ink"
                  />
                  <Text className="font-display text-[22px] text-ink"> de 4</Text>
                </View>
              </View>
            </View>
            <Text className="font-body text-[12.5px] leading-[17px] text-muted">
              {semanaTexto(g.semana.dias, g.semana.extra, g.caixinhas)}
            </Text>
            <Mais texto="Ver os dias" />
          </Pressable>
        </FadeUp>
        <CoresCard onOpen={() => setFolha("cores")} />
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
        <FadeUp delay={160}>
          <Pressable
            onPress={() => router.push("/conquistas")}
            className="flex-row items-center gap-3.5 rounded-3xl bg-surface px-4 py-3.5 active:opacity-90"
            style={shadow.card}
            accessibilityRole="button"
          >
            <AnimatedMedal
              id={quase.id}
              size={62}
              prog={quase.valor / quase.alvo}
              delay={400}
              shine="once"
            />
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-1.5">
                <LiveDot />
                <Text
                  className="font-body-bold text-[11px] uppercase tracking-widest"
                  style={{ color: colors.coralInk }}
                >
                  Quase lá
                </Text>
              </View>
              <Text className="mt-0.5 font-body-bold text-[16px] text-ink" numberOfLines={1}>
                {nomeDa(qm, g.forma)}
              </Text>
              <Text className="font-body text-[13px] text-muted">
                <Text className="font-display text-[15px] text-ink">
                  {faltam(quase) === 1 ? "Falta" : "Faltam"} {faltam(quase)}
                </Text>
                {quase.unidade ? ` ${unidadeTexto(quase.unidade, faltam(quase))}` : ""}
              </Text>
              <Segs
                n={Math.min(quase.alvo, 30)}
                lit={(quase.valor / quase.alvo) * Math.min(quase.alvo, 30)}
                delay={500}
                step={45}
                style={{ marginTop: 8 }}
              />
            </View>
          </Pressable>
        </FadeUp>
      )}

      <BoxModal visible={caixa} onClose={() => setCaixa(false)} />
      <WeekSheet visible={folha === "semana"} onClose={() => setFolha(null)} />
      <CoresSheet visible={folha === "cores"} onClose={() => setFolha(null)} />
    </View>
  );
}

/**
 * Suas cores: só o que a pessoa fez (retorno do Leandro, 04/10/2026: o placar da cidade não é
 * conquista dela, e "1 de 100" parecia que o app tinha flopado). Número = lugares que ela avaliou;
 * frase = o melhor efeito que ela tem agora; anel = bairros rumo aos 6 da Nome na Lista.
 * Antes da primeira avaliação, convida para um lugar conhecido que ela ainda não avaliou.
 */
function CoresCard({ onOpen }: { onOpen: () => void }) {
  const { data: c } = useMinhasCores();
  const { city } = useCity();
  const { data: lugares } = useCityTopPlaces(city?.id, !!c && c.lugares === 0);
  if (!c) return null;
  const conv = convitesDaCidade(lugares, RATING_MIN);
  const alvo = conv.proximo ?? conv.virgens[0] ?? null;
  const bairros = Math.min(BAIRROS_META, c.bairros);
  const zero = c.lugares === 0;

  const numero = zero ? "Sua 1ª cor" : `${c.lugares} ${c.lugares === 1 ? "lugar" : "lugares"}`;
  let frase: string;
  if (zero)
    frase = alvo
      ? `Comece por ${alvo.name}. Já passou por lá?`
      : "Avalie um lugar por onde você passou.";
  else if (c.ultimo_selo) frase = `${c.ultimo_selo} ganhou selo com a sua avaliação.`;
  else if (c.ajudou > 0)
    frase = `${c.ajudou} ${c.ajudou === 1 ? "pessoa abriu" : "pessoas abriram"} a ficha depois da sua avaliação.`;
  else if (c.primeiras > 0)
    frase =
      c.primeiras === 1 && c.ultima_primeira
        ? `Você deu a primeira cor de ${c.ultima_primeira}.`
        : `${c.primeiras} foram a primeira cor de lá.`;
  else frase = `Você já coloriu ${c.bairros} ${c.bairros === 1 ? "bairro" : "bairros"}.`;
  const mais = zero ? (alvo ? "Avaliar" : "Ver lugares") : "Ver o seu mapa";

  const abrir = () => {
    if (zero && alvo) router.push(`/lugar/${alvo.id}?avaliar=1` as Href);
    else if (zero) router.push("/lugares");
    else onOpen();
  };

  return (
    <FadeUp delay={80} style={{ flex: 1, minWidth: 0 }}>
      <Pressable
        onPress={abrir}
        className="gap-2.5 rounded-3xl bg-surface p-3.5 active:opacity-90"
        style={[{ flexGrow: 1 }, shadow.card]}
        accessibilityRole="button"
        accessibilityLabel={`Suas cores: ${numero}. ${frase} ${mais}.`}
      >
        <ProgressEdge frac={bairros / BAIRROS_META} radius={24} duration={1100} />
        <View className="flex-row items-center gap-2.5">
          <SliceRing
            lit={bairros}
            n={BAIRROS_META}
            inner={30}
            gap={6}
            animate
            delay={250}
            step={140}
          />
          <View className="min-w-0 flex-1">
            <Text className="font-body-medium text-[11px] uppercase tracking-wider text-dim">
              Suas cores
            </Text>
            <Text className="font-display text-[22px] text-ink" numberOfLines={1}>
              {numero}
            </Text>
          </View>
        </View>
        <Text className="font-body text-[12.5px] leading-[17px] text-muted" numberOfLines={3}>
          {frase}
        </Text>
        <Mais texto={mais} />
      </Pressable>
    </FadeUp>
  );
}

function Mais({ texto }: { texto: string }) {
  return (
    <View className="mt-auto flex-row items-center gap-0.5">
      <Text className="font-body-bold text-[12px]" style={{ color: colors.turquoiseInk }}>
        {texto}
      </Text>
      <ChevronRight color={colors.turquoiseInk} size={13} strokeWidth={3} />
    </View>
  );
}
