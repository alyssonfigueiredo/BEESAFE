import type { StyleSpecification } from "@maplibre/maplibre-react-native";

import { colors } from "@/theme/tokens";

// Mapa base vetorial do OpenFreeMap (estilo Positron: cinza claro, sem chave, sem limite),
// desenhado no aparelho: nítido em qualquer densidade de tela e em qualquer zoom.
// Dados © OpenStreetMap / OpenMapTiles; a atribuição vem no próprio estilo.
export const mapStyle = "https://tiles.openfreemap.org/styles/positron";

// Reserva: tiles em imagem da Esri (Canvas Light Gray). Ficam borrados em tela Retina, por
// serem imagens de 256 px, mas funcionam se o OpenFreeMap sair do ar: trocar o export acima
// por `mapStyleEsri`.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

export const mapStyleEsri: StyleSpecification = {
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
