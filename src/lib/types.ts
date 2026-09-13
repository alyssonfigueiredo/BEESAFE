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
};

export type PublicPlaceRating = {
  id: string;
  place_id: string;
  stars: number;
  comment: string | null;
  updated_at: string;
  nickname: string;
  is_mine: boolean;
};

export type WelcomingPlace = Pick<
  PublicPlace,
  "id" | "name" | "category" | "neighborhood" | "score" | "rating_count" | "flagged"
>;
