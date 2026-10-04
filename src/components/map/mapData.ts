import { distanceMeters } from "@/lib/geo";
import type { PublicOccurrence, PublicPlace } from "@/lib/types";
import { placeScoreColor } from "@/theme/domain";

type LatLng = { lat: number; lng: number };

/**
 * Área de relato: relatos a menos de ~150 m uns dos outros viram uma mancha só. O alerta é da
 * rua (beco, praça, ponto de ônibus), então ele aparece como área e nunca como pino.
 */
export type RelatoArea = {
  id: string;
  lat: number;
  lng: number;
  /** Raio em metros: 100 m para um relato, cresce devagar com mais relatos (teto 180 m). */
  radius: number;
  occurrences: PublicOccurrence[];
  neighborhood: string | null;
  neighborhoodId: number | null;
  /** Relatos dos últimos 30 dias dentro da área. */
  recent30: number;
};

const JOIN_M = 150;
const DAY = 24 * 60 * 60 * 1000;

export function buildAreas(items: PublicOccurrence[]): RelatoArea[] {
  const groups: { lat: number; lng: number; list: PublicOccurrence[] }[] = [];
  for (const o of items) {
    const p = { lat: o.latitude, lng: o.longitude };
    const g = groups.find((x) => distanceMeters(x, p) < JOIN_M);
    if (g) {
      g.list.push(o);
      const n = g.list.length;
      g.lat += (p.lat - g.lat) / n;
      g.lng += (p.lng - g.lng) / n;
    } else groups.push({ ...p, list: [o] });
  }
  const now = Date.now();
  return groups.map((g) => {
    // Bairro mais frequente da área (relato antigo pode vir sem).
    const tally = new Map<string, { n: number; id: number | null }>();
    for (const o of g.list) {
      if (!o.neighborhood) continue;
      const t = tally.get(o.neighborhood) ?? { n: 0, id: o.neighborhood_id };
      t.n += 1;
      tally.set(o.neighborhood, t);
    }
    const top = [...tally.entries()].sort((a, b) => b[1].n - a[1].n)[0];
    return {
      id: g.list[0].id,
      lat: g.lat,
      lng: g.lng,
      radius: Math.min(100 + (g.list.length - 1) * 15, 180),
      occurrences: g.list,
      neighborhood: top?.[0] ?? null,
      neighborhoodId: top?.[1].id ?? null,
      recent30: g.list.filter((o) => now - Date.parse(o.occurrence_date) <= 30 * DAY).length,
    };
  });
}

/** Círculo em metros como polígono (o círculo do MapLibre é em pixels e não tem tracejado). */
export function circlePolygon(c: LatLng, radiusM: number, steps = 48): GeoJSON.Polygon {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((c.lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring.push([c.lng + dLng * Math.cos(a), c.lat + dLat * Math.sin(a)]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

/** Três camadas por área: halo largo, miolo mais forte e o contorno tracejado por dentro. */
export function areasGeoJSON(areas: RelatoArea[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const a of areas) {
    const c = { lat: a.lat, lng: a.lng };
    features.push(
      {
        type: "Feature",
        properties: { areaId: a.id, ring: "outer" },
        geometry: circlePolygon(c, a.radius),
      },
      {
        type: "Feature",
        properties: { areaId: a.id, ring: "inner" },
        geometry: circlePolygon(c, a.radius * 0.6),
      },
      {
        type: "Feature",
        properties: { areaId: a.id, ring: "dash" },
        geometry: circlePolygon(c, a.radius * 0.86),
      },
    );
  }
  return { type: "FeatureCollection", features };
}

/** Nota com vírgula: 4,7. */
export function scoreLabel(score: number) {
  return score.toFixed(1).replace(".", ",");
}

export function hasScore(p: Pick<PublicPlace, "score">) {
  return p.score != null;
}

/** Selo de verdade (5 avaliações): "poucas" é justamente a falta dele. */
export function hasSeal(p: Pick<PublicPlace, "badge">) {
  return !!p.badge && p.badge !== "poucas";
}

export function placesGeoJSON(places: PublicPlace[], rated: boolean): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: places
      .filter((p) => hasScore(p) === rated)
      .map((p) => ({
        type: "Feature",
        id: p.id,
        properties: rated
          ? {
              id: p.id,
              label: scoreLabel(Number(p.score)),
              color: placeScoreColor(Number(p.score)),
            }
          : { id: p.id },
        geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
      })),
  };
}

/** 1000 → "1.000" (sem depender do Intl do aparelho). */
export function formatCount(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function plural(n: number, one: string, many: string) {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}
