import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { OccurrenceType } from "@/theme/domain";

export type CityStats = {
  total: number;
  last_30_days: number;
  top_type: OccurrenceType | null;
  top_neighborhood: string | null;
};

export function useCityStats(cityId: number | undefined) {
  return useQuery({
    queryKey: ["city-stats", cityId],
    enabled: !!cityId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("city_stats", { p_city_id: cityId! }).single();
      if (error) throw error;
      return data as CityStats;
    },
  });
}
