import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { PublicOccurrence, WelcomingPlace } from "@/lib/types";
import type { DayPeriod, OccurrenceSetting, OccurrenceType } from "@/theme/domain";

export type NeighborhoodSummary = {
  neighborhood_id: number;
  neighborhood: string;
  city: string;
  state: string;
  total: number;
  high: number;
  last_occurrence: string | null;
  by_type: Partial<Record<OccurrenceType, number>>;
  by_setting: Partial<Record<OccurrenceSetting, number>>;
  by_period: Partial<Record<DayPeriod, number>>;
  places_total: number;
  places_rated: number;
};

export function useNeighborhood(id: number | undefined) {
  return useQuery({
    queryKey: ["neighborhood", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("neighborhood_summary", { p_neighborhood_id: id! })
        .single();
      if (error) throw error;
      return data as NeighborhoodSummary;
    },
  });
}

export function useNeighborhoodPlaces(id: number | undefined) {
  return useQuery({
    queryKey: ["neighborhood-places", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("neighborhood_places", {
        p_neighborhood_id: id!,
      });
      if (error) throw error;
      return data as WelcomingPlace[];
    },
  });
}

export function useNeighborhoodOccurrences(id: number | undefined) {
  return useQuery({
    queryKey: ["neighborhood-occurrences", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("neighborhood_occurrences", {
        p_neighborhood_id: id!,
      });
      if (error) throw error;
      return data as PublicOccurrence[];
    },
  });
}
