import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/lib/supabase";
import type { AreaRisk, PublicOccurrence } from "@/lib/types";

export const occurrencesKey = (cityId: number) => ["occurrences", cityId] as const;

/** Relatos ativos da cidade (até 500, mais recentes primeiro), com invalidação em tempo real. */
export function useOccurrences(cityId: number | undefined) {
  const client = useQueryClient();

  useEffect(() => {
    if (!cityId) return;
    const channel = supabase
      .channel(`occurrences:city:${cityId}`, { config: { private: true } })
      .on("broadcast", { event: "occurrence_changed" }, () => {
        client.invalidateQueries({ queryKey: occurrencesKey(cityId) });
        client.invalidateQueries({ queryKey: ["area-risk", cityId] });
        client.invalidateQueries({ queryKey: ["city-stats", cityId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cityId, client]);

  return useQuery({
    queryKey: occurrencesKey(cityId ?? 0),
    enabled: !!cityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_occurrences")
        .select("*")
        .eq("city_id", cityId!)
        .order("occurrence_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as PublicOccurrence[];
    },
  });
}

export function useAreaRisk(cityId: number | undefined, limit = 6) {
  return useQuery({
    queryKey: ["area-risk", cityId, limit],
    enabled: !!cityId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("area_risk_ranking", {
        p_city_id: cityId!,
        p_limit: limit,
      });
      if (error) throw error;
      return data as AreaRisk[];
    },
  });
}
