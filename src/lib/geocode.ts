// Endereço escrito → ponto no mapa.
//
// Por que existe: no cadastro de lugar, o endereço era só texto. A cidade e o bairro do lugar
// saem da COORDENADA (trigger no banco), então quem escrevia "Rua X, 100" de outra cidade e
// marcava o ponto pela própria localização cadastrava o lugar onde estava, não onde o lugar é.
//
// Usa o Nominatim (OpenStreetMap): grátis e sem chave — a regra do projeto é não gastar com a
// API do Google. A política do Nominatim pede User-Agent identificável e no máximo uma busca por
// segundo, então a busca é SEMPRE por botão, nunca a cada tecla digitada.
import type { City } from "@/lib/types";

const BASE = "https://nominatim.openstreetmap.org/search";
const UA = "Irisa/1.0 (appirisa@gmail.com)";

export type Achado = {
  lat: number;
  lng: number;
  /** Endereço como o OSM entende, para a pessoa confirmar que é aquele mesmo. */
  rotulo: string;
  /** Falso quando o endereço achado cai em outra cidade que não a escolhida. */
  cidadeConfere: boolean;
};

const chave = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

type Resposta = {
  lat: string;
  lon: string;
  display_name?: string;
  address?: Record<string, string>;
};

export async function geocodificar(endereco: string, city: City): Promise<Achado | null> {
  const params = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    limit: "1",
    country: "Brasil",
    state: city.state,
    city: city.name,
    street: endereco.trim(),
  });

  const r = await fetch(`${BASE}?${params}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!r.ok) throw new Error("A busca de endereço não respondeu. Tente de novo.");

  const lista = (await r.json()) as Resposta[];
  const achado = lista[0];
  if (!achado) return null;

  const a = achado.address ?? {};
  const cidadeAchada = a.city ?? a.town ?? a.village ?? a.municipality ?? "";

  return {
    lat: Number(achado.lat),
    lng: Number(achado.lon),
    rotulo: achado.display_name ?? endereco.trim(),
    // Sem cidade na resposta não dá para afirmar que está errado; só não dá para confirmar.
    cidadeConfere: !cidadeAchada || chave(cidadeAchada) === chave(city.name),
  };
}
