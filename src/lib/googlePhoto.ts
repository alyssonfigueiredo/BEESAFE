// Foto do lugar via Google Places (New). A imagem nunca passa pelo nosso banco: o app monta a
// URL e o Google entrega. Sem chave configurada, o app simplesmente não mostra foto.
const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;

export function googlePhotoUrl(photoName: string | null | undefined, maxWidthPx: number) {
  if (!KEY || !photoName) return null;
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${KEY}`;
}
