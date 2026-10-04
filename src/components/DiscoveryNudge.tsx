import { router, usePathname } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useId, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOutDown,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { PlacePhoto } from "@/components/PlacePhoto";
import {
  OLHOS_DESCOBERTA,
  fraseDescoberta,
  limparDescobertaConcluida,
  logDescoberta,
  marcarDescobertaHoje,
  marcarMostradoNaSessao,
  marcarRelatoNaSessao,
  ORIGEM_DESCOBERTA,
  useAlgumaFolhaAberta,
  useDescobertaConcluida,
  useDescobertaHoje,
  useDiscoverySlate,
  useMostradoNaSessao,
  useRelatoNaSessao,
} from "@/hooks/useDiscovery";
import { useGamification, useRewardOpen } from "@/hooks/useGamification";
import { tabBarBottom } from "@/hooks/useScreenInsets";
import { tourNestaSessao, useTour } from "@/hooks/useTour";
import { distanceMeters, formatDistance } from "@/lib/geo";
import type { PublicPlace } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import { useCity } from "@/providers/CityProvider";
import { PLACE_CATEGORIES, RATING_MIN } from "@/theme/domain";
import { colors, glass, mark } from "@/theme/tokens";

// "Passou por aqui?" — às vezes, nunca fixo. Regras (docs/descoberta-proposta.html):
// - no máximo uma vez por dia (aparelho) e o banco devolve nada se a pessoa fechou no X hoje ou já
//   viu 2 lugares hoje;
// - nunca na mesma sessão do tour, nem nos 30 min depois dele;
// - só no Início ou em Lugares, depois de ~8 s lá; nunca com folha/modal aberta, no Apoio, no
//   registro de relato nem depois de um relato na sessão;
// - X fecha (discovery_closed); "Não conheço" troca uma vez e, na segunda, despede-se;
// - "Já fui" abre a ficha de sempre com o formulário aberto; na volta, se avaliou, o cartão mostra
//   o lugar aceso por uns segundos e some.

const ESPERA_MS = 8000;
const ACESO_MS = 4200;
const AR = Animated.createAnimatedComponent(Rect);

type Fase = "pergunta" | "tchau" | "aguardando" | "fim";
type Cartao = { lugares: PublicPlace[]; slot: number; fase: Fase; dia: number };

function contagem(n: number) {
  if (n <= 0) return "Ainda sem avaliação";
  const falta = RATING_MIN - n;
  const base = `${n} avaliaç${n > 1 ? "ões" : "ão"}`;
  if (falta <= 0) return base;
  return `${base} · falta${falta > 1 ? "m" : ""} ${falta} para o selo`;
}

/** Borda arco-íris que se desenha em volta do cartão aceso. */
function Borda({ w, h }: { w: number; h: number }) {
  const gid = `nudge-${useId()}`;
  const reduce = useReducedMotion();
  const r = 24 - 1.25;
  const P = 2 * (w - 2.5 - 2 * r) + 2 * (h - 2.5 - 2 * r) + 2 * Math.PI * r;
  const t = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    t.set(withDelay(150, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
  }, [reduce, t]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: P * (1 - t.get()) }));
  if (w <= 0 || h <= 0) return null;
  return (
    <Svg
      width={w}
      height={h}
      style={{ position: "absolute", left: 0, top: 0 }}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          {mark.ring.map((c, i) => (
            <Stop key={c} offset={i / (mark.ring.length - 1)} stopColor={c} />
          ))}
        </LinearGradient>
      </Defs>
      <AR
        x={1.25}
        y={1.25}
        width={w - 2.5}
        height={h - 2.5}
        rx={r}
        ry={r}
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray={[P, P]}
        animatedProps={props}
      />
    </Svg>
  );
}

export function DiscoveryNudge() {
  const { session } = useAuth();
  const pathname = usePathname();
  const tour = useTour(false);
  const folha = useAlgumaFolhaAberta();
  const recompensa = useRewardOpen();
  const relato = useRelatoNaSessao();
  const mostrado = useMostradoNaSessao();
  const concluido = useDescobertaConcluida();
  const { data: g } = useGamification();
  const { city, userLocation } = useCity();
  const safe = useSafeAreaInsets();
  const [cartao, setCartao] = useState<Cartao | null>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });

  // Passou pelo registro de relato: nada de cartão até a próxima sessão.
  useEffect(() => {
    if (pathname === "/registrar") marcarRelatoNaSessao();
  }, [pathname]);

  const rotaOk = pathname === "/" || pathname === "/lugares";
  // Medalha nova esperando a celebração = um modal vai abrir; o cartão espera.
  const medalhaNaFila = !!g?.conquistadas?.some((c) => !c.visto);
  const livre = rotaOk && !folha && !recompensa && !medalhaNaFila;

  const base = !!session && tour === "fechado" && !tourNestaSessao() && !relato && !mostrado;
  const hoje = useDescobertaHoje(base);
  const buscar = base && hoje.data?.pode === true;
  const slate = useDiscoverySlate(buscar, city?.id, userLocation);
  const lugares = slate.data;

  // Depois de ~8 s parado no Início ou em Lugares, sem nada aberto, o cartão sobe.
  const armar = buscar && !!lugares?.length && livre && cartao === null;
  const dia = hoje.data?.dia ?? 1;
  useEffect(() => {
    if (!armar || !lugares?.length) return;
    const t = setTimeout(() => {
      marcarMostradoNaSessao();
      marcarDescobertaHoje();
      setCartao({ lugares, slot: 0, fase: "pergunta", dia });
      logDescoberta("discovery_impression", lugares[0].id, 1);
    }, ESPERA_MS);
    return () => clearTimeout(t);
  }, [armar, lugares, dia]);

  const lugar = cartao ? cartao.lugares[cartao.slot] : null;
  const aceso = cartao?.fase === "aguardando" && !!lugar && concluido === lugar.id;

  // Aceso: fica uns segundos e some sozinho.
  const mostrandoAceso = aceso && livre;
  useEffect(() => {
    if (!mostrandoAceso) return;
    const t = setTimeout(() => {
      limparDescobertaConcluida();
      setCartao((c) => (c ? { ...c, fase: "fim" } : c));
    }, ACESO_MS);
    return () => clearTimeout(t);
  }, [mostrandoAceso]);

  if (!cartao || !lugar) return null;
  const visivel =
    livre && (cartao.fase === "pergunta" || cartao.fase === "tchau" || mostrandoAceso);
  if (!visivel) return null;

  const slot = cartao.slot + 1;
  const fechar = () => {
    logDescoberta("discovery_closed", lugar.id, slot);
    setCartao({ ...cartao, fase: "fim" });
  };
  const naoConheco = () => {
    logDescoberta("discovery_dismissed", lugar.id, slot);
    const proximo = cartao.lugares[cartao.slot + 1];
    if (cartao.slot === 0 && proximo) {
      setCartao({ ...cartao, slot: 1 });
      logDescoberta("discovery_impression", proximo.id, 2);
    } else {
      setCartao({ ...cartao, fase: "tchau" });
      setTimeout(() => setCartao((c) => (c ? { ...c, fase: "fim" } : c)), 1400);
    }
  };
  const jaFui = () => {
    logDescoberta("discovery_place_opened", lugar.id, slot);
    setCartao({ ...cartao, fase: "aguardando" });
    router.push({
      pathname: "/lugar/[id]",
      params: { id: lugar.id, origem: ORIGEM_DESCOBERTA, avaliar: "1" },
    });
  };

  const distancia = userLocation
    ? formatDistance(distanceMeters(userLocation, { lat: lugar.latitude, lng: lugar.longitude }))
    : null;
  const meta = [PLACE_CATEGORIES[lugar.category], lugar.neighborhood, distancia]
    .filter(Boolean)
    .join(" · ");
  const n = lugar.rating_count + (aceso ? 1 : 0);

  return (
    <Animated.View
      key={`${lugar.id}-${aceso ? "aceso" : "pergunta"}`}
      entering={aceso ? FadeIn.duration(300) : FadeInDown.duration(480)}
      exiting={FadeOutDown.duration(320)}
      onLayout={(e) => setTam({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: tabBarBottom(safe.bottom) + glass.tabBarHeight + 10,
        borderRadius: 24,
        backgroundColor: colors.solid,
        boxShadow: "0 14px 36px rgba(20,24,41,0.22)",
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      }}
    >
      <PlacePhoto
        category={lugar.category}
        photoName={lugar.photo_name}
        photoUrl={lugar.photo_url}
        photoCredit={lugar.photo_credit}
        photoCreditUri={lugar.photo_credit_uri}
        photoAuthor={lugar.photo_author}
        photoAuthorUri={lugar.photo_author_uri}
        size={64}
        muted
        progress={aceso ? 1 : 0}
      />
      <View className="min-w-0 flex-1 pr-7">
        <Text className="font-body-bold text-[11px] uppercase tracking-[1.5px] text-turquoiseInk">
          {OLHOS_DESCOBERTA[(cartao.dia + cartao.slot) % OLHOS_DESCOBERTA.length]}
        </Text>
        <Text
          className="mt-0.5 font-body-bold text-[15px] leading-[19px] text-ink"
          numberOfLines={1}
        >
          {lugar.name}
        </Text>
        <Text className="font-body text-[12px] leading-[16px] text-dim" numberOfLines={1}>
          {meta}
        </Text>
        <Text className="font-body text-[12px] leading-[16px] text-dim">{contagem(n)}</Text>
        {aceso ? (
          <Animated.Text
            entering={FadeInDown.duration(420).delay(300)}
            className="mt-1.5 font-body-medium text-[13px] leading-[18px] text-turquoiseInk"
          >
            {fraseDescoberta(lugar.id)}
          </Animated.Text>
        ) : cartao.fase === "tchau" ? (
          <Animated.Text
            entering={FadeIn.duration(250)}
            className="mt-1.5 font-body-medium text-[13px] leading-[18px] text-dim"
          >
            Tudo bem. Até outro dia.
          </Animated.Text>
        ) : (
          <View className="mt-2 flex-row items-center gap-2">
            <Pressable
              onPress={jaFui}
              className="h-[34px] items-center justify-center rounded-full px-[15px] active:opacity-80"
              style={{ backgroundColor: colors.night }}
            >
              <Text className="font-body-bold text-[13px] text-paper">Já fui</Text>
            </Pressable>
            <Pressable onPress={naoConheco} hitSlop={8} className="px-0.5 py-1.5 active:opacity-60">
              <Text className="font-body-medium text-[12.5px] text-dim">Não conheço</Text>
            </Pressable>
          </View>
        )}
      </View>
      {!aceso && cartao.fase === "pergunta" && (
        <Pressable
          onPress={fechar}
          hitSlop={8}
          accessibilityLabel="Fechar"
          className="absolute right-2 top-2 h-[30px] w-[30px] items-center justify-center rounded-full bg-subtle"
        >
          <X color={colors.muted} size={15} />
        </Pressable>
      )}
      {aceso && <Borda w={tam.w} h={tam.h} />}
    </Animated.View>
  );
}
