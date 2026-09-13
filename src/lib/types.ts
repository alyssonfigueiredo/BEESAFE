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
