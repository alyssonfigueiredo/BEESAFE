import type { OccurrenceType, Severity } from "@/theme/domain";

export type PublicOccurrence = {
  id: string;
  type: OccurrenceType;
  severity: Severity;
  description: string | null;
  city_id: number;
  neighborhood_id: number | null;
  neighborhood: string | null;
  city: string;
  state: string;
  occurrence_date: string;
  created_at: string;
  is_obfuscated: boolean;
  latitude: number;
  longitude: number;
};

export type City = { id: number; name: string; state: string; lat: number; lng: number };

export type AreaRisk = {
  neighborhood_id: number;
  neighborhood: string;
  total: number;
  high: number;
  score: number;
};

export type PublicPlace = {
  id: string;
  name: string;
  category: import("@/theme/domain").PlaceCategory;
  address: string | null;
  city_id: number;
  neighborhood_id: number | null;
  neighborhood: string | null;
  city: string;
  state: string;
  verified: boolean;
  created_at: string;
  latitude: number;
  longitude: number;
  score: number | null;
  rating_count: number;
  recent_occurrences: number;
  recent_high_occurrences: number;
  flagged: boolean;
  /** Relatos a 100 m em 180 dias, grave contando 3x. É medida da REGIÃO, não do lugar. */
  area_score: number;
  /** null = sem relato. Nunca significa "seguro": com poucos usuários, silêncio não é ausência de risco. */
  area_level: "atencao" | "alerta" | null;
  score_welcome: number | null;
  score_affection: number | null;
  score_restroom: number | null;
  score_crowd: number | null;
  rating_stddev: number | null;
  recent_on_site: number;
  badge: import("@/theme/domain").Badge | null;
  // Foto do Google Places, só enquanto dentro dos 30 dias permitidos (a view esconde a vencida).
  photo_name: string | null;
  photo_author: string | null;
  photo_author_uri: string | null;
};

export type PublicPlaceRating = {
  id: string;
  place_id: string;
  stars: number | null;
  comment: string | null;
  updated_at: string;
  nickname: string;
  is_mine: boolean;
  welcome: number | null;
  affection: number | null;
  restroom: number | null;
  crowd: number | null;
  overall: number | null;
};

export type WelcomingPlace = Pick<
  PublicPlace,
  | "id"
  | "name"
  | "category"
  | "neighborhood"
  | "score"
  | "rating_count"
  | "flagged"
  | "area_level"
  | "badge"
  | "score_welcome"
  | "score_affection"
  | "score_restroom"
  | "score_crowd"
  | "photo_name"
  | "photo_author"
  | "photo_author_uri"
>;
