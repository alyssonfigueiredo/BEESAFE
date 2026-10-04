import { router, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { Counter, FadeUp, Segs } from "@/components/gami/Anim";
import { SliceRing } from "@/components/gami/Rings";
import { Sheet } from "@/components/gami/Sheet";
import { PlacePhoto } from "@/components/PlacePhoto";
import { CityMap } from "@/components/CityMap";
import {
  convitesDaCidade,
  useCityTopPlaces,
  useMinhasCores,
  type MinhasCores,
} from "@/hooks/useGamification";
import type { PublicPlace } from "@/lib/types";
import { useCity } from "@/providers/CityProvider";
import { PLACE_CATEGORIES, RATING_MIN, SCALE } from "@/theme/domain";
import { colors, shadow } from "@/theme/tokens";

// Suas cores: o detalhe do cartão do Início. Só o que a pessoa fez (lugares, primeiras cores,
// selos que saíram com a avaliação dela, bairros, quantas pessoas abriram a ficha depois), o mapa
// dos lugares que ela coloriu e, embaixo, convites para lugares que ela ainda não avaliou.
// Nada de placar da cidade: "1 de 100" parecia que o app tinha flopado (retorno do Leandro).

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

/** Bairros para a medalha Nome na Lista: o anel do cartão e da folha. */
export const BAIRROS_META = 6;

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

function Numero({
  valor,
  rotulo,
  delay,
  cor,
}: {
  valor: number;
  rotulo: string;
  delay: number;
  cor: string;
}) {
  return (
    <FadeUp delay={delay} style={{ flexBasis: "47%", flexGrow: 1 }}>
      <View className="gap-0.5 rounded-[20px] bg-solid px-3.5 py-3" style={shadow.field}>
        <Counter
          value={valor}
          duration={800}
          delay={delay + 100}
          className="font-display text-[26px]"
          style={{ color: cor }}
        />
        <Text className="font-body text-[12.5px] leading-[17px] text-muted">{rotulo}</Text>
      </View>
    </FadeUp>
  );
}

function Mapa({ c, onGo }: { c: MinhasCores; onGo: (h: Href) => void }) {
  // O CityMap desenha PublicPlace; aqui só importam id, ponto e a cor da nota da própria pessoa.
  const pontos = c.itens.map(
    (i) =>
      ({
        id: i.id,
        latitude: i.lat,
        longitude: i.lng,
        score: i.nota,
        flagged: false,
      }) as PublicPlace,
  );
  const primeiro = c.itens[0];
  return (
    <FadeUp delay={500}>
      <View className="overflow-hidden rounded-[22px]" style={shadow.card}>
        <CityMap
          occurrences={[]}
          places={pontos}
          center={{ lat: primeiro.lat, lng: primeiro.lng }}
          zoom={13}
          onSelectPlace={(p) => onGo(`/lugar/${p.id}`)}
          style={{ height: 200 }}
        />
      </View>
    </FadeUp>
  );
}

function Conteudo({ onClose }: { onClose: () => void }) {
  const { data: c } = useMinhasCores();
  const { city } = useCity();
  const { data: lugares = [], isLoading } = useCityTopPlaces(city?.id);
  if (!c) return null;

  // Convites só para o que a pessoa ainda não avaliou.
  const conv = convitesDaCidade(lugares, RATING_MIN);
  const perto = conv.perto.slice(0, 4);
  const virgens = conv.virgens.slice(0, perto.length >= 3 ? 2 : 4);
  const bairros = Math.min(BAIRROS_META, c.bairros);

  const go = (h: Href) => {
    onClose();
    router.push(h);
  };

  return (
    <>
      <View className="flex-row items-center gap-4">
        <SliceRing
          lit={bairros}
          n={BAIRROS_META}
          size={104}
          inner={30}
          gap={5}
          animate
          delay={450}
          step={160}
        />
        <View className="min-w-0 flex-1">
          <Text className="font-display text-[28px] uppercase leading-[30px] text-ink">
            {c.lugares > 0 ? `${c.lugares} ${plural(c.lugares, "lugar", "lugares")}` : "Sua 1ª cor"}
          </Text>
          <Text className="mt-1 font-body text-[14px] leading-[20px] text-muted">
            {c.lugares > 0
              ? `com a sua cor, em ${c.bairros} ${plural(c.bairros, "bairro", "bairros")}.`
              : "Avalie um lugar por onde você passou e ele ganha a sua cor."}
          </Text>
        </View>
      </View>

      {c.lugares > 0 && (
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          <Numero
            valor={c.ajudou}
            rotulo={`${plural(c.ajudou, "pessoa abriu", "pessoas abriram")} a ficha depois da sua avaliação`}
            delay={250}
            cor={colors.turquoiseInk}
          />
          <Numero
            valor={c.primeiras}
            rotulo={plural(c.primeiras, "primeira cor de um lugar", "primeiras cores de um lugar")}
            delay={330}
            cor={colors.coralInk}
          />
          <Numero
            valor={c.selos}
            rotulo={plural(c.selos, "selo saiu com a sua", "selos saíram com a sua")}
            delay={410}
            cor={colors.lilacInk}
          />
          <Numero
            valor={c.bairros}
            rotulo={`${plural(c.bairros, "bairro", "bairros")} (Nome na Lista pede ${BAIRROS_META})`}
            delay={490}
            cor={colors.ink}
          />
        </View>
      )}

      {c.itens.length > 0 && (
        <>
          <Secao>O seu mapa</Secao>
          <Mapa c={c} onGo={go} />
        </>
      )}

      {!isLoading && perto.length > 0 && (
        <>
          <Secao>Perto do selo</Secao>
          <View className="gap-2">
            {perto.map((p, i) => (
              <Perto key={p.id} p={p} i={i} onGo={go} />
            ))}
          </View>
        </>
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

      <Text className="font-body text-[12.5px] leading-[18px] text-dim">
        Só você vê. Quem abriu a ficha é contado uma vez por aparelho, sem saber quem é, e a
        contagem começou em 04/10/2026.
      </Text>
    </>
  );
}

export function CoresSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Conteudo onClose={onClose} />
    </Sheet>
  );
}
