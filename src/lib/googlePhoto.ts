// Foto do lugar via Google Places (New). DESLIGADO (05/11/2026, pedido do Alysson): cada
// visualização de card chamava o endpoint de mídia do Google ao vivo, sem cache e sem o teto
// de 150/dia do script — isso gerou R$95 em outubro (+689%) na SKU Place Details Photos.
// Regra do projeto é zero gasto com a Google Places API: sem foto própria (Mapillary/comunidade),
// o lugar cai no ícone da categoria em vez de buscar no Google.
export function googlePhotoUrl(_photoName: string | null | undefined, _maxWidthPx: number) {
  return null;
}
