import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type PressEventWithFeatures,
} from "@maplibre/maplibre-react-native";
import { useMemo } from "react";
import { View, type NativeSyntheticEvent } from "react-native";

import { buildHeatCells } from "@/lib/heat";
import { darkMapStyle } from "@/lib/mapStyle";
import type { PublicOccurrence } from "@/lib/types";
import { OCCURRENCE_TYPES, SEVERITIES } from "@/theme/domain";
import { colors } from "@/theme/tokens";

type LngLat = { lng: number; lat: number };

type Props = {
  occurrences: PublicOccurrence[];
  center: LngLat;
  zoom?: number;
  /** Modo seleção: esconde calor e pontos e devolve o ponto tocado. */
  onPick?: (point: LngLat) => void;
  picked?: LngLat | null;
  onSelect?: (occurrence: PublicOccurrence | null) => void;
  style?: object;
};

export function CityMap({
  occurrences,
  center,
  zoom = 12,
  onPick,
  picked,
  onSelect,
  style,
}: Props) {
  const pickMode = !!onPick;

  const heat = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: buildHeatCells(occurrences).map((c) => ({
        type: "Feature",
        properties: { color: c.color, radius: c.radius, count: c.count },
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
      })),
    }),
    [occurrences],
  );

  const points = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: occurrences.map((o) => ({
        type: "Feature",
        id: o.id,
        properties: {
          id: o.id,
          color: SEVERITIES[o.severity].color,
          radius: o.severity === "alta" ? 7 : 5,
          typeColor: OCCURRENCE_TYPES[o.type].color,
        },
        geometry: { type: "Point", coordinates: [o.longitude, o.latitude] },
      })),
    }),
    [occurrences],
  );

  function handlePointPress(e: NativeSyntheticEvent<PressEventWithFeatures>) {
    const id = e.nativeEvent.features[0]?.properties?.id as string | undefined;
    onSelect?.(occurrences.find((o) => o.id === id) ?? null);
  }

  return (
    <View style={[{ flex: 1, overflow: "hidden", borderRadius: 16 }, style]}>
      <Map
        style={{ flex: 1 }}
        mapStyle={darkMapStyle}
        logo={false}
        attribution
        attributionPosition={{ bottom: 8, right: 8 }}
        compass={false}
        touchPitch={false}
        touchRotate={false}
        onPress={(e) => {
          if (pickMode) onPick?.({ lng: e.nativeEvent.lngLat[0], lat: e.nativeEvent.lngLat[1] });
          else onSelect?.(null);
        }}
      >
        <Camera initialViewState={{ center: [center.lng, center.lat], zoom }} />

        {!pickMode && (
          <GeoJSONSource id="heat" data={heat}>
            <Layer
              id="heat-circles"
              type="circle"
              style={{
                circleColor: ["get", "color"],
                circleRadius: ["get", "radius"],
                circleOpacity: 0.3,
                circleStrokeColor: ["get", "color"],
                circleStrokeWidth: 1,
                circleStrokeOpacity: 0.5,
              }}
            />
          </GeoJSONSource>
        )}

        {!pickMode && (
          <GeoJSONSource id="points" data={points} onPress={handlePointPress}>
            <Layer
              id="point-circles"
              type="circle"
              style={{
                circleColor: ["get", "color"],
                circleRadius: ["get", "radius"],
                circleStrokeColor: colors.night,
                circleStrokeWidth: 1.5,
              }}
            />
          </GeoJSONSource>
        )}

        {picked && (
          <Marker lngLat={[picked.lng, picked.lat]} anchor="center">
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.yellow,
                borderWidth: 3,
                borderColor: colors.night,
              }}
            />
          </Marker>
        )}
      </Map>
    </View>
  );
}
