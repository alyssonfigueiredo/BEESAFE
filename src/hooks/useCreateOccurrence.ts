import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { OccurrenceType, Severity } from "@/theme/domain";

export type NewOccurrence = {
  type: OccurrenceType;
  severity: Severity;
  description: string;
  lat: number;
  lng: number;
  occurrence_date: string; // yyyy-mm-dd
  place_id?: string | null; // relato que aponta um estabelecimento cadastrado
};

const MESSAGES: Record<string, string> = {
  P0001: "Esse ponto está fora de um município cadastrado. Ajuste o marcador.",
  "23514": "Data inválida: não pode ser no futuro e a descrição tem no máximo 2000 caracteres.",
  "42501": "Sua sessão expirou. Entre de novo.",
  P0002: "Limite de 5 relatos por dia atingido. Tente amanhã.",
};

export function useCreateOccurrence() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewOccurrence) => {
      // Sem .select(): usuário comum não tem policy de leitura na tabela, só na view.
      const { error } = await supabase.from("occurrences").insert({
        type: input.type,
        severity: input.severity,
        description: input.description.trim() || null,
        location: `SRID=4326;POINT(${input.lng} ${input.lat})`,
        occurrence_date: input.occurrence_date,
        place_id: input.place_id ?? null,
      });
      if (error) throw new Error(MESSAGES[error.code ?? ""] ?? error.message);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["occurrences"] });
      client.invalidateQueries({ queryKey: ["area-risk"] });
      client.invalidateQueries({ queryKey: ["city-stats"] });
      client.invalidateQueries({ queryKey: ["places"] });
      client.invalidateQueries({ queryKey: ["place"] });
      client.invalidateQueries({ queryKey: ["welcoming"] });
    },
  });
}
