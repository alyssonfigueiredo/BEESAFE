import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Aurora } from "@/components/Aurora";
import { LegendSheet } from "@/components/map/LegendSheet";
import { MapList, type ListItem } from "@/components/map/MapList";
import { MapPanel, type MapMode } from "@/components/map/MapPanel";
import { MapaMap, type MapFocus } from "@/components/map/MapaMap";
import { buildAreas, hasSeal, plural, type RelatoArea } from "@/components/map/mapData";
import { NearPlaceCard, OpenCard, RelatoMiniCard } from "@/components/map/NearCards";
import { NearSheet, type SheetCard } from "@/components/map/NearSheet";
import { useFavoritos, useLugaresFavoritos } from "@/hooks/useFavoritos";
import { useAreaRisk, useOccurrences } from "@/hooks/useOccurrences";
import { useNearPlaces, usePlaces } from "@/hooks/usePlaces";
import { tabBarBottom, useScreenInsets } from "@/hooks/useScreenInsets";
import { distanceMeters, formatDistance } from "@/lib/geo";
import type { PublicPlace } from "@/lib/types";
import { useCity } from "@/providers/CityProvider";
import { BADGES, OCCURRENCE_TYPES, PLACE_CATEGORIES, type OccurrenceType } from "@/theme/domain";
import { glass } from "@/theme/tokens";

const TYPE_KEYS = Object.keys(OCCURRENCE_TYPES) as OccurrenceType[];
const CAROUSEL = 12;
const LIST = 60;
const NEAR_AREA_M = 2000;

type Selection =
  | { kind: "place"; place: PublicPlace }
  | { kind: "cluster"; count: number; places: PublicPlace[]; seq: number }
  | { kind: "area"; area: RelatoArea };

const openPlace = (p: PublicPlace) =>
  router.push({ pathname: "/lugar/[id]", params: { id: p.id } });

/**
 * Mapa em tela cheia. Em cima, um painel sólido (Mapa | Lista e as camadas); no pé, a folha
 * "Perto de você" com os lugares mais perto. O lugar recebe cor, a rua recebe aviso: relato é
 * sempre área, nunca pino, e nada aqui diz que uma região é segura — sem relato quer dizer só
 * que ninguém registrou.
 */
export default function MapaScreen() {
  const insets = useScreenInsets();
  const safe = useSafeAreaInsets();
  const { city, loading, userLocation, locate } = useCity();
  const { data: occurrences = [] } = useOccurrences(city?.id);
  const { data: ranking = [] } = useAreaRisk(city?.id, 6);
  const { data: cityPlaces = [], isLoading: loadingCity } = usePlaces(city?.id);
  // Com localização, os lugares mais perto de quem usa, de qualquer cidade (migration 41).
  const near = useNearPlaces(userLocation, null);

  const [mode, setMode] = useState<MapMode>("mapa");
  const [layers, setLayers] = useState({ lugares: true, relatos: true });
  // Quero ir: a lista abre o mapa com ?camada=quero&t=… (t muda a cada toque, para "Ver no mapa"
  // ligar a camada de novo mesmo depois de a pessoa ter desligado aqui).
  const { camada, t } = useLocalSearchParams<{ camada?: string; t?: string }>();
  const [queroSel, setQueroSel] = useState<{ t?: string; on: boolean } | null>(null);
  const queroOn = queroSel && queroSel.t === t ? queroSel.on : camada === "quero";
  const { data: favs } = useFavoritos();
  const { data: favItens = [] } = useLugaresFavoritos();
  const favPlaces = useMemo(
    () => favItens.filter((i) => !i.visitado_em).map((i) => i.place),
    [favItens],
  );
  const queroCount = favs == null ? null : favs.filter((f) => !f.visitado_em).length;
  const [types, setTypes] = useState<Set<OccurrenceType>>(() => new Set(TYPE_KEYS));
  const [legend, setLegend] = useState(false);
  const [sel, setSel] = useState<Selection | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [panelH, setPanelH] = useState(104);
  const [sheetH, setSheetH] = useState(190);

  const nearPlaces = useMemo(
    () => (near.isError ? [] : (near.data ?? [])),
    [near.isError, near.data],
  );
  const nearMode = !!userLocation && nearPlaces.length > 0;

  // O mapa mostra o lote da cidade somado aos de perto (quem está na cidade vizinha também vê).
  const mapPlaces = useMemo(() => {
    if (queroOn) return favPlaces;
    const seen = new Set<string>();
    const out: PublicPlace[] = [];
    for (const p of [...cityPlaces, ...nearPlaces]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
    return out;
  }, [cityPlaces, nearPlaces, queroOn, favPlaces]);

  const visibleOcc = useMemo(
    () => occurrences.filter((o) => types.has(o.type)),
    [occurrences, types],
  );
  const areas = useMemo(() => buildAreas(visibleOcc), [visibleOcc]);
  const counts = useMemo(() => {
    const c: Partial<Record<OccurrenceType, number>> = {};
    for (const o of occurrences) c[o.type] = (c[o.type] ?? 0) + 1;
    return c;
  }, [occurrences]);

  const dist = useMemo(
    () => (p: { latitude: number; longitude: number }) =>
      userLocation ? distanceMeters(userLocation, { lat: p.latitude, lng: p.longitude }) : null,
    [userLocation],
  );

  // Perto de você: por distância com localização; sem ela, os mais bem avaliados da cidade.
  const nearList = useMemo<ListItem[]>(() => {
    if (queroOn) {
      return favPlaces
        .map((p) => ({ place: p, distance: dist(p) }))
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    if (nearMode) {
      return nearPlaces
        .map((p) => ({ place: p, distance: dist(p) }))
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    return [...cityPlaces]
      .sort(
        (a, b) =>
          (b.score == null ? -1 : Number(b.score)) - (a.score == null ? -1 : Number(a.score)) ||
          b.rating_count - a.rating_count,
      )
      .map((p) => ({ place: p, distance: dist(p) }));
  }, [nearMode, nearPlaces, cityPlaces, dist, queroOn, favPlaces]);

  const sealCount = useMemo(
    () =>
      userLocation
        ? mapPlaces.filter((p) => hasSeal(p) && (dist(p) ?? Infinity) <= 1000).length
        : cityPlaces.filter(hasSeal).length,
    [userLocation, mapPlaces, cityPlaces, dist],
  );

  const nearestArea = useMemo(() => {
    if (!userLocation) return null;
    let best: { area: RelatoArea; distance: number } | null = null;
    for (const a of areas) {
      const d = distanceMeters(userLocation, a);
      if (!best || d < best.distance) best = { area: a, distance: d };
    }
    return best && best.distance <= NEAR_AREA_M ? best : null;
  }, [areas, userLocation]);
  const areasWithin1km = useMemo(
    () => (userLocation ? areas.filter((a) => distanceMeters(userLocation, a) <= 1000).length : 0),
    [areas, userLocation],
  );

  if (loading || !city) {
    return (
      <View className="flex-1 items-center justify-center bg-paper px-6">
        <Text className="font-body text-base text-muted">
          {loading
            ? "Localizando sua cidade…"
            : "Nenhuma cidade encontrada. Verifique a permissão de localização."}
        </Text>
      </View>
    );
  }

  const panelTop = insets.paddingTop - 8;
  const sheetBottom = glass.tabBarHeight + tabBarBottom(safe.bottom) + 8;

  function selectFromCard(p: PublicPlace) {
    setSel({ kind: "place", place: p });
    setFocus((f) => ({ lat: p.latitude, lng: p.longitude, zoom: 16, seq: (f?.seq ?? 0) + 1 }));
  }

  function openArea(a: RelatoArea) {
    if (a.neighborhoodId != null) {
      router.push({ pathname: "/bairro/[id]", params: { id: String(a.neighborhoodId) } });
      return;
    }
    setMode("mapa");
    setSel({ kind: "area", area: a });
    setFocus((f) => ({ lat: a.lat, lng: a.lng, zoom: 15.5, seq: (f?.seq ?? 0) + 1 }));
  }

  // ---------- conteúdo da folha ----------
  let title: string;
  let summary: ReactNode;
  let cards: SheetCard[];
  let listKey: string;
  let empty: string | undefined;

  if (sel?.kind === "place") {
    const p = sel.place;
    const d = dist(p);
    title = p.name;
    listKey = `place-${p.id}`;
    const badge = p.badge && p.badge !== "poucas" ? BADGES[p.badge] : null;
    summary = (
      <Text className="font-body text-[12.5px] text-muted" numberOfLines={2}>
        {[PLACE_CATEGORIES[p.category], d != null ? formatDistance(d) : p.neighborhood]
          .filter(Boolean)
          .join(" · ")}
        {badge ? (
          <>
            {" · "}
            <Text className="font-body-bold" style={{ color: badge.ink }}>
              {badge.label}
            </Text>
          </>
        ) : p.score == null ? (
          " · ainda sem nota"
        ) : null}
      </Text>
    );
    cards = [
      {
        key: p.id,
        node: <NearPlaceCard place={p} distance={d} onPress={() => openPlace(p)} />,
      },
      { key: "ficha", node: <OpenCard onPress={() => openPlace(p)} /> },
    ];
  } else if (sel?.kind === "cluster") {
    title = `${plural(sel.count, "lugar", "lugares")} nesta região`;
    listKey = `cluster-${sel.seq}`;
    summary = (
      <Text className="font-body text-[12.5px] text-muted">
        Aproxime o mapa para ver um por um.
      </Text>
    );
    cards = sel.places
      .map((p) => ({ place: p, distance: dist(p) }))
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .map(({ place, distance }) => ({
        key: place.id,
        node: (
          <NearPlaceCard place={place} distance={distance} onPress={() => selectFromCard(place)} />
        ),
      }));
  } else if (sel?.kind === "area") {
    const a = sel.area;
    title = "Área com relato";
    listKey = `area-${a.id}`;
    const quando =
      a.recent30 > 0
        ? `${plural(a.recent30, "relato", "relatos")} nos últimos 30 dias`
        : plural(a.occurrences.length, "relato registrado", "relatos registrados");
    summary = (
      <Text className="font-body text-[12.5px] text-muted" numberOfLines={2}>
        <Text className="font-body-bold text-coralInk">{quando}</Text>
        {a.neighborhood ? ` · ${a.neighborhood}` : ""}
        {" · o aviso é da rua, não de um lugar"}
      </Text>
    );
    cards = a.occurrences.slice(0, 10).map((o) => ({
      key: o.id,
      node: <RelatoMiniCard occurrence={o} />,
    }));
  } else {
    title = userLocation ? "Perto de você" : `Em ${city.name}`;
    listKey = `near-${nearMode ? "gps" : "city"}`;
    empty = loadingCity ? "Carregando lugares…" : "Nenhum lugar por aqui ainda.";
    const areaPart =
      layers.relatos &&
      (userLocation
        ? nearestArea && (
            <>
              {" · "}
              <Text className="font-body-bold text-coralInk">
                {plural(Math.max(1, areasWithin1km), "área de atenção", "áreas de atenção")}
              </Text>
              {` a ${formatDistance(nearestArea.distance)}`}
            </>
          )
        : areas.length > 0 && (
            <>
              {" · "}
              <Text className="font-body-bold text-coralInk">
                {plural(areas.length, "área com relato", "áreas com relato")}
              </Text>
            </>
          ));
    summary = (
      <View style={{ gap: 2 }}>
        <Text className="font-body text-[12.5px] text-muted">
          {userLocation
            ? sealCount === 0
              ? "Nenhum lugar com selo até 1 km ainda"
              : `${sealCount} com selo até 1 km`
            : `${plural(sealCount, "lugar com selo", "lugares com selo")} na cidade`}
          {areaPart}
        </Text>
        {!userLocation && (
          <Pressable onPress={() => void locate(true)} hitSlop={6}>
            <Text className="font-body-medium text-[12.5px] text-turquoiseInk underline">
              Ligar a localização para ver o que está perto
            </Text>
          </Pressable>
        )}
      </View>
    );
    cards = layers.lugares
      ? nearList.slice(0, CAROUSEL).map(({ place, distance }) => ({
          key: place.id,
          node: (
            <NearPlaceCard
              place={place}
              distance={distance}
              onPress={() => selectFromCard(place)}
            />
          ),
        }))
      : [];
    if (!layers.lugares) empty = "Lugares escondidos no mapa.";
    else if (queroOn && favPlaces.length === 0)
      empty = "Nada no Quero ir ainda. Toque no coração de um lugar para salvar.";
  }

  return (
    <View className="flex-1 bg-paper">
      <MapaMap
        key={city.id}
        center={{ lat: city.lat, lng: city.lng }}
        userLocation={userLocation}
        places={mapPlaces}
        areas={areas}
        showPlaces={layers.lugares}
        showRelatos={layers.relatos}
        selectedId={sel?.kind === "place" ? sel.place.id : null}
        focus={focus}
        padTop={panelTop + panelH}
        padBottom={sheetBottom + sheetH}
        onSelectPlace={(p) => setSel({ kind: "place", place: p })}
        onSelectCluster={(places, count) =>
          setSel((s) => ({
            kind: "cluster",
            places,
            count,
            seq: (s?.kind === "cluster" ? s.seq : 0) + 1,
          }))
        }
        onSelectArea={(a) => setSel({ kind: "area", area: a })}
        onPressEmpty={() => setSel(null)}
      />

      {mode === "lista" && (
        <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
          <Aurora />
          <MapList
            items={nearList.slice(0, LIST)}
            nearestArea={nearestArea}
            ranking={ranking}
            showPlaces={layers.lugares}
            showRelatos={layers.relatos}
            nearMode={nearMode}
            loading={nearMode ? near.isLoading : loadingCity}
            paddingTop={panelTop + panelH + 12}
            paddingBottom={insets.paddingBottom}
            onOpenPlace={openPlace}
            onOpenArea={openArea}
          />
        </Animated.View>
      )}

      <View pointerEvents="box-none" className="absolute left-0 right-0" style={{ top: panelTop }}>
        <MapPanel
          mode={mode}
          onMode={setMode}
          showPlaces={layers.lugares}
          showRelatos={layers.relatos}
          placeCount={mapPlaces.length}
          relatoCount={visibleOcc.length}
          onTogglePlaces={() => {
            if (sel?.kind === "place" || sel?.kind === "cluster") setSel(null);
            setLayers((l) => ({ ...l, lugares: !l.lugares }));
          }}
          onToggleRelatos={() => {
            if (sel?.kind === "area") setSel(null);
            setLayers((l) => ({ ...l, relatos: !l.relatos }));
          }}
          onFilters={() => setLegend(true)}
          showQuero={!!queroOn}
          queroCount={queroCount}
          onToggleQuero={() => {
            if (sel?.kind === "place" || sel?.kind === "cluster") setSel(null);
            setQueroSel({ t, on: !queroOn });
            if (!queroOn) setLayers((l) => ({ ...l, lugares: true }));
          }}
          filtering={types.size < TYPE_KEYS.length}
          onLayout={(e) => setPanelH(e.nativeEvent.layout.height)}
        />
      </View>

      {mode === "mapa" && (
        <View
          pointerEvents="box-none"
          className="absolute"
          style={{ left: 10, right: 10, bottom: sheetBottom }}
        >
          <NearSheet
            title={title}
            summary={summary}
            cards={cards}
            listKey={listKey}
            empty={empty}
            onRegistrar={() => router.push("/registrar")}
            onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
          />
        </View>
      )}

      <LegendSheet
        visible={legend}
        onClose={() => setLegend(false)}
        types={types}
        counts={counts}
        onToggleType={(t) => {
          if (sel?.kind === "area") setSel(null);
          setTypes((prev) => {
            const next = new Set(prev);
            if (next.has(t)) next.delete(t);
            else next.add(t);
            return next;
          });
        }}
      />
    </View>
  );
}
