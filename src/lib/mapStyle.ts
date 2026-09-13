import type { StyleSpecification } from "@maplibre/maplibre-react-native";

import { colors } from "@/theme/tokens";

// Tiles da Esri (Canvas Dark Gray): gratuitos, escuros, sem chave. Testado no protótipo original.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

export const darkMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    "esri-base": {
      type: "raster",
      tiles: [`${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 16,
      attribution: "Tiles © Esri",
    },
    "esri-reference": {
      type: "raster",
      tiles: [`${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    { id: "background", type: "background", paint: { "background-color": colors.night } },
    { id: "esri-base", type: "raster", source: "esri-base" },
    {
      id: "esri-reference",
      type: "raster",
      source: "esri-reference",
      paint: { "raster-opacity": 0.9 },
    },
  ],
};
