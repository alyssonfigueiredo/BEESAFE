import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { PlaceCategory } from "@/theme/domain";
import type { WelcomingPlace } from "@/lib/types";

/**
 * Busca de verdade no banco (irise_suggest_places, migration 50): a Irise nunca inventa lugar,
 * só escolhe o filtro — isso aqui é quem acha os lugares reais.
 */
export function useIriseSuggest() {
  return useMutation({
    mutationFn: async (args: { cityId: number; categories: PlaceCategory[] | null; semNota: boolean }) => {
      const { data, error } = await supabase.rpc("irise_suggest_places", {
        p_city_id: args.cityId,
        p_categories: args.categories,
        p_sem_nota: args.semNota,
        p_limit: 3,
      });
      if (error) throw error;
      return (data ?? []) as WelcomingPlace[];
    },
  });
}

/** "O que tem por perto?": o mesmo places_near que a aba Lugares usa, sem IA nenhuma. */
export function useIriseNear() {
  return useMutation({
    mutationFn: async (args: { lat: number; lng: number }) => {
      const { data, error } = await supabase.rpc("places_near", {
        p_lat: args.lat,
        p_lng: args.lng,
        p_limit: 3,
      });
      if (error) throw error;
      return (data ?? []) as WelcomingPlace[];
    },
  });
}

export type OrchestratedPlace = WelcomingPlace & { reason: string | null };
type OrchestratorResponse = { message: string; places: OrchestratedPlace[] | null; error?: string };

/**
 * Irise Orchestrator: um único assistente, por fora. Por dentro, o Groq decide se o pedido precisa
 * buscar lugar (e escreve a resposta final) e, quando precisa, o Gemini ranqueia e explica os
 * candidatos reais que o banco já achou — a pessoa nunca vê "Groq" nem "Gemini". Nunca manda a
 * localização exata da pessoa pra fora, só o nome da cidade (coordenada vai só pro places_near,
 * no próprio banco).
 */
export function useIriseOrchestrate() {
  return useMutation({
    mutationFn: async (args: {
      texto: string;
      cidade: string;
      cityId: number | undefined;
      perto: { lat: number; lng: number } | null;
    }) => {
      const { data, error } = await supabase.functions.invoke<OrchestratorResponse>("irise-orchestrator", {
        body: { texto: args.texto, cidade: args.cidade, cityId: args.cityId, perto: args.perto },
      });
      if (error || !data || data.error) {
        throw new Error(data?.error ?? error?.message ?? "A Irise não conseguiu entender agora.");
      }
      return { message: data.message, places: data.places ?? null };
    },
  });
}
