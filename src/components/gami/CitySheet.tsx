import { router, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Counter, FadeUp, Segs } from "@/components/gami/Anim";
import { SliceRing } from "@/components/gami/Rings";
import { Sheet } from "@/components/gami/Sheet";
import { PlacePhoto } from "@/components/PlacePhoto";
import { convitesDaCidade, useCityTopPlaces, useGamification } from "@/hooks/useGamification";
import type { PublicPlace } from "@/lib/types";
import { useCity } from "@/providers/CityProvider";
import { BADGES, PLACE_CATEGORIES, RATING_MIN, SCALE } from "@/theme/domain";
import { colors } from "@/theme/tokens";

// Detalhe da cidade: quantos dos 100 lugares mais conhecidos já têm selo, os que estão perto
// de ganhar (com o botão de avaliar) e os que já ganharam.

function Secao({ children }: { children: ReactNode }) {
  return (
    <Text className="mt-1 font-body-bold text-[12px] uppercase tracking-widest text-dim">
      {children}
    </Text>
  );
}

function subtitulo(p: PublicPlace) {
  return [PLACE_CATEGORIES[p.category] ?? "Lugar", p.neighborhood].filter(Boolean).join(" · ");
}

function Tile({ p }: { p: PublicPlace }) {
  // Só a foto nossa (R2) ou o azulejo da categoria: nada de pedir foto ao Google daqui.
  return <PlacePhoto category={p.category} photoUrl={p.photo_url} size={44} />;
}

function Perto({ p, i, onGo }: { p: PublicPlace; i: number; onGo: (h: Href) => void }) {
  const k = Math.min(RATING_MIN - 1, p.rating_count);
  const falta = RATING_MIN - k;
  return (
    <FadeUp delay={550 + i * 90}>
      <Pressable
        onPress={() => onGo(`/lugar/${p.id}`)}
        className="flex-row items-center gap-3 rounded-[18px] bg-solid px-3 py-2.5 active:opacity-90"
      >
        <Tile p={p} />
        <View className="min-w-0 flex-1">
          <Text className="font-body-bold text-[14px] text-ink" numberOfLines={1}>
            {p.name}
          </Text>
          <Text className="font-body text-[12px] text-dim" numberOfLines={1}>
            {subtitulo(p)} · {k === 0 ? "seja a 1ª cor" : `falta${falta > 1 ? "m" : ""} ${falta}`}
          </Text>
          <View className="mt-1.5 flex-row" style={{ width: 92 }}>
            <Pips k={k} delay={700 + i * 160} />
          </View>
        </View>
        <Pressable
          onPress={() => onGo(`/lugar/${p.id}?avaliar=1`)}
          className="h-[34px] items-center justify-center rounded-full px-3.5 active:opacity-80"
          style={{ backgroundColor: colors.night }}
          hitSlop={6}
        >
          <Text className="font-body-bold text-[13px] text-paper">Avaliar</Text>
        </Pressable>
      </Pressable>
    </FadeUp>
  );
}

/** Cinco pílulas, uma por avaliação, nas cores da escala do selo. */
function Pips({ k, delay }: { k: number; delay: number }) {
  return (
    <View className="flex-1 flex-row" style={{ gap: 3 }}>
      {SCALE.map((c, i) => (
        <View key={i} style={{ flex: 1 }}>
          <Segs
            n={1}
            lit={i < k ? 1 : 0}
            delay={delay + i * 70}
            colorful={false}
            color={c}
            height={6}
          />
        </View>
      ))}
    </View>
  );
}

function ComSelo({ p, i, onGo }: { p: PublicPlace; i: number; onGo: (h: Href) => void }) {
  const b = p.badge ? BADGES[p.badge] : null;
  return (
    <FadeUp delay={700 + i * 90}>
      <Pressable
        onPress={() => onGo(`/lugar/${p.id}`)}
        className="flex-row items-center gap-3 rounded-[18px] bg-solid px-3 py-2.5 active:opacity-90"
      >
        <Tile p={p} />
        <View className="min-w-0 flex-1">
          <Text className="font-body-bold text-[14px] text-ink" numberOfLines={1}>
            {p.name}
          </Text>
          <Text className="font-body text-[12px] text-dim" numberOfLines={1}>
            {subtitulo(p)}
          </Text>
        </View>
        <View
          className="rounded-full px-3 py-1.5"
          style={{ backgroundColor: (b?.color ?? colors.turquoise) + "33" }}
        >
          <Text
            className="font-body-bold text-[12px]"
            style={{ color: b?.ink ?? colors.turquoiseInk }}
          >
            {b?.label ?? "Com selo"}
          </Text>
        </View>
      </Pressable>
    </FadeUp>
  );
}

function Conteudo({ onClose }: { onClose: () => void }) {
  const { data: g } = useGamification();
  const { city } = useCity();
  const { data: lugares = [], isLoading } = useCityTopPlaces(city?.id);
  const c = g?.cidade;
  if (!c) return null;

  // Só convida para o que a pessoa ainda pode ajudar (o que ela já avaliou sai da lista).
  const conv = convitesDaCidade(lugares, RATING_MIN);
  const perto = conv.perto.slice(0, 5);
  const virgens = conv.virgens.slice(0, perto.length >= 3 ? 2 : 4);
  const prox = conv.proximo;
  const kProx = prox ? Math.min(RATING_MIN - 1, prox.rating_count) : 0;
  const faltaProx = RATING_MIN - kProx;
  const nome = city?.name ?? "sua cidade";
  const feitos = lugares
    .filter((p) => p.rating_count >= RATING_MIN)
    .sort((a, b) => b.rating_count - a.rating_count)
    .slice(0, 5);

  const go = (h: Href) => {
    onClose();
    router.push(h);
  };

  return (
    <>
      {c.com_selo === 0 ? (
        // Nenhum selo ainda: em vez de "0 de 100", o primeiro selo da cidade e quem está perto dele.
        <View className="flex-row items-center gap-4">
          <SliceRing
            lit={kProx}
            n={RATING_MIN}
            size={104}
            inner={30}
            gap={5}
            animate
            delay={450}
            step={160}
          />
          <View className="min-w-0 flex-1">
            <Text className="font-display text-[28px] uppercase leading-[30px] text-ink">
              1º selo de {nome}
            </Text>
            <Text className="mt-1 font-body text-[14px] leading-[20px] text-muted">
              {prox
                ? `${prox.name} está a ${faltaProx} avaliaç${faltaProx > 1 ? "ões" : "ão"} do selo. Já passou por lá?`
                : `Nenhum lugar tem selo ainda. São ${RATING_MIN} avaliações para o primeiro: a sua pode começar.`}
            </Text>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center gap-4">
          <SliceRing
            lit={c.com_selo}
            n={c.total}
            size={104}
            inner={34}
            gap={0.8}
            animate
            delay={450}
            step={55}
          />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-baseline">
              <Counter
                value={c.com_selo}
                duration={1100}
                delay={450}
                className="font-display text-[28px] text-ink"
              />
              <Text className="font-display text-[28px] uppercase text-ink"> de {c.total}</Text>
            </View>
            <Text className="mt-1 font-body text-[14px] leading-[20px] text-muted">
              dos lugares mais conhecidos{city ? ` de ${city.name}` : ""} já têm selo ({RATING_MIN}{" "}
              avaliações).
            </Text>
            {c.semana > 0 && (
              <View
                className="mt-2 self-start rounded-full px-3 py-1.5"
                style={{ backgroundColor: colors.turquoise + "33" }}
              >
                <Text
                  className="font-body-bold text-[12.5px]"
                  style={{ color: colors.turquoiseInk }}
                >
                  +{c.semana} esta semana
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      <Secao>Perto do selo</Secao>
      {isLoading ? (
        <Text className="font-body text-[13px] text-dim">Carregando…</Text>
      ) : perto.length > 0 ? (
        <View className="gap-2">
          {perto.map((p, i) => (
            <Perto key={p.id} p={p} i={i} onGo={go} />
          ))}
        </View>
      ) : (
        <Text className="font-body text-[13px] leading-[18px] text-dim">
          {lugares.some((p) => p.meu && p.rating_count < RATING_MIN)
            ? "Os que estavam perto você já avaliou. Agora é com quem ainda não foi."
            : "Nenhum deles tem avaliação ainda. A primeira já põe um lugar no caminho do selo."}
        </Text>
      )}

      {!isLoading && virgens.length > 0 && (
        <>
          <Secao>Ainda sem nenhuma cor</Secao>
          <View className="gap-2">
            {virgens.map((p, i) => (
              <Perto key={p.id} p={p} i={perto.length + i} onGo={go} />
            ))}
          </View>
          <Text className="font-body text-[12px] leading-[17px] text-dim">
            A primeira avaliação de um lugar conta para a medalha Inaugurou.
          </Text>
        </>
      )}

      {feitos.length > 0 && (
        <>
          <Secao>Já têm selo</Secao>
          <View className="gap-2">
            {feitos.map((p, i) => (
              <ComSelo key={p.id} p={p} i={i} onGo={go} />
            ))}
          </View>
        </>
      )}

      <Text className="font-body text-[12.5px] leading-[18px] text-dim">
        A meta usa os {c.total} lugares mais conhecidos da cidade, não todos os do mapa, para o
        número andar toda semana.
      </Text>
    </>
  );
}

export function CitySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Conteudo onClose={onClose} />
    </Sheet>
  );
}
