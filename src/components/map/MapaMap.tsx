import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  type GeoJSONSourceRef,
  Layer,
  Map,
  type PressEventWithFeatures,
} from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, type NativeSyntheticEvent } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { distanceMeters } from "@/lib/geo";
import { mapStyle } from "@/lib/mapStyle";
import type { PublicPlace } from "@/lib/types";
import { colors } from "@/theme/tokens";

import { areasGeoJSON, placesGeoJSON, type RelatoArea } from "./mapData";

type LatLng = { lat: number; lng: number };

/** Pedido de câmera vindo de fora (cartão tocado, área da lista). `seq` muda a cada pedido. */
export type MapFocus = LatLng & { zoom?: number; seq: number };

type Props = {
  center: LatLng;
  userLocation: LatLng | null;
  places: PublicPlace[];
  areas: RelatoArea[];
  showPlaces: boolean;
  showRelatos: boolean;
  selectedId: string | null;
  focus: MapFocus | null;
  /** Espaço tomado pelo painel de cima e pela folha de baixo: a câmera centraliza no meio livre. */
  padTop: number;
  padBottom: number;
  onSelectPlace: (place: PublicPlace) => void;
  onSelectCluster: (places: PublicPlace[], count: number) => void;
  onSelectArea: (area: RelatoArea) => void;
  onPressEmpty: () => void;
};

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const FONT_BOLD = ["Noto Sans Bold"]; // fonte que o estilo Positron do OpenFreeMap serve
const ME = "#3B82F6";
const DOT = "#8E93A5";

/**
 * Mapa da aba Mapa. O lugar recebe cor, a rua recebe aviso: lugar com nota é um ponto todo na
 * cor da nota (sem número — isso fica pra ficha e pro cartão); sem nota, ponto cinza discreto;
 * muitos juntos viram um círculo com "+contagem". Relato
 * é sempre mancha coral de ~100 m com contorno tracejado, nunca pino — a violência é da rua,
 * não do bar que está perto.
 */
export function MapaMap({
  center,
  userLocation,
  places,
  areas,
  showPlaces,
  showRelatos,
  selectedId,
  focus,
  padTop,
  padBottom,
  onSelectPlace,
  onSelectCluster,
  onSelectArea,
  onPressEmpty,
}: Props) {
  const reduce = useReducedMotion();
  const cameraRef = useRef<CameraRef>(null);
  const clusterRef = useRef<GeoJSONSourceRef>(null);
  // As camadas nascem transparentes e acendem quando o mapa termina de carregar (transição do
  // próprio MapLibre, sem custo no JS).
  const [ready, setReady] = useState(false);

  // Câmera inicial: perto de quem usa, se a pessoa está na cidade; senão, o centro da cidade.
  // Lida só na montagem (o pai troca a `key` quando troca a cidade).
  const [initial] = useState(() => {
    const near = userLocation && distanceMeters(userLocation, center) < 60_000;
    const c = near ? userLocation : center;
    return { center: [c.lng, c.lat] as [number, number], zoom: near ? 14.2 : 12.4, near: !!near };
  });

  // A localização costuma chegar depois do mapa: na primeira vez, leva a câmera até a pessoa
  // (se ela está nesta cidade). Depois disso a câmera é de quem está mexendo no mapa.
  const centered = useRef(initial.near);
  useEffect(() => {
    if (centered.current || !userLocation) return;
    centered.current = true;
    if (distanceMeters(userLocation, center) >= 60_000) return;
    cameraRef.current?.easeTo({
      center: [userLocation.lng, userLocation.lat],
      zoom: 14.2,
      duration: reduce ? 0 : 800,
    });
  }, [userLocation, center, reduce]);

  const areaData = useMemo(() => (showRelatos ? areasGeoJSON(areas) : EMPTY), [areas, showRelatos]);
  const unrated = useMemo(
    () => (showPlaces ? placesGeoJSON(places, false) : EMPTY),
    [places, showPlaces],
  );
  const rated = useMemo(
    () => (showPlaces ? placesGeoJSON(places, true) : EMPTY),
    [places, showPlaces],
  );
  const me = useMemo<GeoJSON.FeatureCollection>(
    () =>
      userLocation
        ? {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "Point", coordinates: [userLocation.lng, userLocation.lat] },
              },
            ],
          }
        : EMPTY,
    [userLocation],
  );

  const padding = { top: padTop + 16, bottom: padBottom + 16, left: 24, right: 24 };

  useEffect(() => {
    if (!focus) return;
    cameraRef.current?.easeTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom ?? 15,
      padding: { top: padTop + 16, bottom: padBottom + 16, left: 24, right: 24 },
      duration: reduce ? 0 : 600,
    });
    // padTop/padBottom de propósito fora: mudar a altura da folha não move a câmera sozinha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, reduce]);

  const fade = (delay: number) => ({ duration: reduce ? 0 : 700, delay: reduce ? 0 : delay });
  const on = ready ? 1 : 0;
  const sel = selectedId ?? "";
  const isSel: ["==", ["get", string], string] = ["==", ["get", "id"], sel];

  // O toque num pino também chega ao onPress do mapa. O pino marca a hora e o mapa ignora o que
  // vier logo em seguida (mesma solução do CityMap).
  const pinAt = useRef(0);
  const firstProps = (e: NativeSyntheticEvent<PressEventWithFeatures>) => {
    e.stopPropagation();
    pinAt.current = Date.now();
    return e.nativeEvent.features[0]?.properties ?? null;
  };

  function handlePlace(e: NativeSyntheticEvent<PressEventWithFeatures>) {
    const f = e.nativeEvent.features[0];
    const props = firstProps(e);
    if (!props) return;
    if (props.cluster) {
      const id = Number(props.cluster_id);
      const count = Number(props.point_count ?? 0);
      const coords = (f?.geometry as GeoJSON.Point | undefined)?.coordinates;
      const src = clusterRef.current;
      if (!src) return;
      src
        .getClusterExpansionZoom(id)
        .then((z) => {
          if (!coords) return;
          cameraRef.current?.easeTo({
            center: [coords[0], coords[1]],
            zoom: Math.min(z + 0.3, 17),
            padding,
            duration: reduce ? 0 : 600,
          });
        })
        .catch(() => {});
      src
        .getClusterLeaves(id, 20, 0)
        .then((leaves) => {
          const ids = new Set(leaves.map((l) => String(l.properties?.id)));
          onSelectCluster(
            places.filter((p) => ids.has(p.id)),
            count,
          );
        })
        .catch(() => onSelectCluster([], count));
      return;
    }
    const place = places.find((p) => p.id === props.id);
    if (place) onSelectPlace(place);
  }

  function handleArea(e: NativeSyntheticEvent<PressEventWithFeatures>) {
    const props = firstProps(e);
    const area = areas.find((a) => a.id === props?.areaId);
    if (area) onSelectArea(area);
  }

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={mapStyle}
      logo={false}
      attribution
      attributionPosition={{ bottom: padBottom + 8, right: 12 }}
      compass={false}
      touchPitch={false}
      touchRotate={false}
      onDidFinishLoadingMap={() => setReady(true)}
      onPress={(e) => {
        const f = (e.nativeEvent as { features?: unknown[] }).features;
        if ((f && f.length > 0) || Date.now() - pinAt.current < 400) return;
        onPressEmpty();
      }}
    >
      <Camera ref={cameraRef} initialViewState={{ center: initial.center, zoom: initial.zoom }} />

      {/* Relatos: mancha coral em degradê (halo + miolo) e contorno tracejado por dentro. */}
      <GeoJSONSource id="mapa-areas" data={areaData} onPress={handleArea}>
        <Layer
          id="mapa-area-outer"
          type="fill"
          filter={["==", ["get", "ring"], "outer"]}
          paint={{
            "fill-color": colors.coral,
            "fill-opacity": 0.12 * on,
            "fill-opacity-transition": fade(300),
          }}
        />
        <Layer
          id="mapa-area-inner"
          type="fill"
          filter={["==", ["get", "ring"], "inner"]}
          paint={{
            "fill-color": colors.coral,
            "fill-opacity": 0.16 * on,
            "fill-opacity-transition": fade(450),
          }}
        />
        <Layer
          id="mapa-area-dash"
          type="line"
          filter={["==", ["get", "ring"], "dash"]}
          paint={{
            "line-color": colors.coralInk,
            "line-opacity": 0.45 * on,
            "line-opacity-transition": fade(600),
            "line-width": 1.5,
            "line-dasharray": [2, 2],
          }}
        />
      </GeoJSONSource>

      {/* Lugares sem nota: agrupados. O grupo é cinza (igual ao ponto solto) — nunca branco/roxo,
          porque cinza aqui significa "sem avaliação", não uma categoria com cor própria. */}
      <GeoJSONSource
        id="mapa-places"
        ref={clusterRef}
        data={unrated}
        cluster
        clusterRadius={46}
        clusterMaxZoom={14}
        onPress={handlePlace}
      >
        <Layer
          id="mapa-cluster-shadow"
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": colors.night,
            "circle-opacity": 0.14 * on,
            "circle-opacity-transition": fade(250),
            "circle-blur": 0.7,
            "circle-translate": [0, 3],
            "circle-radius": ["step", ["get", "point_count"], 22, 10, 25, 50, 28, 200, 31],
          }}
        />
        <Layer
          id="mapa-cluster"
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": DOT,
            "circle-opacity": 0.5 * on,
            "circle-opacity-transition": fade(250),
            "circle-radius": ["step", ["get", "point_count"], 18, 10, 21, 50, 24, 200, 27],
            "circle-stroke-color": DOT,
            "circle-stroke-width": 2 * on,
            "circle-stroke-width-transition": fade(400),
            "circle-stroke-opacity": 0.9,
          }}
        />
        <Layer
          id="mapa-cluster-count"
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            // "+23", nunca só "23": uma nota nunca começa com "+", então não há como confundir
            // contagem de grupo com nota de lugar (migration de UI, 04/10/2026).
            "text-field": ["concat", "+", ["get", "point_count_abbreviated"]],
            "text-font": FONT_BOLD,
            "text-size": 12,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          }}
          paint={{
            "text-color": colors.ink,
            "text-opacity": on,
            "text-opacity-transition": fade(300),
          }}
        />
        <Layer
          id="mapa-dot"
          type="circle"
          filter={["!", ["has", "point_count"]]}
          paint={{
            "circle-color": ["case", isSel, colors.night, DOT],
            "circle-color-transition": { duration: reduce ? 0 : 250, delay: 0 },
            "circle-opacity": ["case", isSel, 1, 0.6 * on],
            "circle-opacity-transition": fade(250),
            // Zoom só pode ser a entrada de um interpolate no topo da expressão.
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              12,
              ["case", isSel, 7, 3],
              16,
              ["case", isSel, 8, 5],
            ],
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": ["case", isSel, 2.5, 1],
          }}
        />
      </GeoJSONSource>

      {/* Lugares com nota: sempre à vista, ponto todo na cor da nota — sem número, pra nunca
          parecer a contagem do agrupamento (pedido do Leandro, 04/10/2026; a nota em si segue
          na ficha do lugar e no cartão da lista). Selecionado vira tinta escura. */}
      <GeoJSONSource id="mapa-rated" data={rated} onPress={handlePlace}>
        <Layer
          id="mapa-pin-shadow"
          type="circle"
          paint={{
            "circle-color": colors.night,
            "circle-opacity": 0.18 * on,
            "circle-opacity-transition": fade(600),
            "circle-blur": 0.7,
            "circle-translate": [0, 3],
            "circle-radius": ["case", isSel, 22, 19],
          }}
        />
        <Layer
          id="mapa-pin"
          type="circle"
          paint={{
            "circle-color": ["case", isSel, colors.night, ["get", "color"]],
            "circle-color-transition": { duration: reduce ? 0 : 250, delay: 0 },
            "circle-opacity": on,
            "circle-opacity-transition": fade(600),
            "circle-radius": ["case", isSel, 19, 16],
            "circle-radius-transition": { duration: reduce ? 0 : 250, delay: 0 },
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 3,
            "circle-stroke-opacity": on,
            "circle-stroke-opacity-transition": fade(600),
          }}
        />
      </GeoJSONSource>

      {/* Você: ponto azul com halo. */}
      <GeoJSONSource id="mapa-me" data={me}>
        <Layer
          id="mapa-me-halo"
          type="circle"
          paint={{ "circle-color": ME, "circle-opacity": 0.18, "circle-radius": 18 }}
        />
        <Layer
          id="mapa-me-dot"
          type="circle"
          paint={{
            "circle-color": ME,
            "circle-radius": 7,
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 3,
          }}
        />
      </GeoJSONSource>
    </Map>
  );
}
