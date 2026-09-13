import type { StyleSpecification } from "@maplibre/maplibre-react-native";

import { colors } from "@/theme/tokens";

// Tiles da Esri (Canvas Light Gray): gratuitos, sem chave, combinam com a paleta clara.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

export const mapStyle: StyleSpecification = {
  version: 8,
  sources: {
    "esri-base": {
      type: "raster",
      tiles: [`${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 16,
      attribution: "Tiles © Esri",
    },
    "esri-reference": {
      type: "raster",
      tiles: [`${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": colors.paper } },
    { id: "esri-base", type: "raster", source: "esri-base" },
    {
      id: "esri-reference",
      type: "raster",
      source: "esri-reference",
      paint: { "raster-opacity": 0.9 },
    },
  ],
};
