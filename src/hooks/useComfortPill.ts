import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type ComfortPill = { id: number; line1: string; line2: string; body: string };

/** A última pílula recebida (app ou push) — a tela de pílulas abre com ela. */
export function useLastComfortPill() {
  return useQuery({
    queryKey: ["last-comfort-pill"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_last_comfort_pill");
      if (error) throw error;
      return (data?.[0] as (ComfortPill & { shown_at: string }) | undefined) ?? null;
    },
  });
}

/** Pede uma pílula nova (sorteada sem repetir até esgotar o banco) e atualiza o cache da última. */
export function useNextComfortPill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("next_comfort_pill");
      if (error) throw error;
      const pilula = data?.[0] as ComfortPill | undefined;
      if (!pilula) throw new Error("Nenhuma pílula disponível agora.");
      return pilula;
    },
    onSuccess: (pilula) => {
      client.setQueryData(["last-comfort-pill"], { ...pilula, shown_at: new Date().toISOString() });
    },
  });
}
