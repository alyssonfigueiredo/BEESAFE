import { useMutation } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { IriseIntent } from "@/lib/iriseRouter";
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

type IriseIntentResponse = {
  categories: string[] | null;
  sem_nota: boolean;
  mensagem: string;
  provider?: string;
  error?: string;
};

/**
 * Camada 2: só chamada quando o roteador (camada 1, sem IA) não entende o texto. Manda pro
 * Groq ou Gemini pela Edge Function irise-intent, que devolve só a intenção — nunca um lugar.
 * Nunca manda a localização exata da pessoa, só o nome da cidade.
 */
export function useIriseIntent() {
  return useMutation({
    mutationFn: async (args: { texto: string; cidade: string }) => {
      const { data, error } = await supabase.functions.invoke<IriseIntentResponse>("irise-intent", {
        body: { texto: args.texto, cidade: args.cidade },
      });
      if (error || !data || data.error) {
        throw new Error(data?.error ?? error?.message ?? "A Irise não conseguiu entender agora.");
      }
      const intent: IriseIntent = {
        categories: (data.categories as PlaceCategory[] | null) ?? null,
        semNota: data.sem_nota === true,
        perto: false,
        mensagem: data.mensagem || "Separei esses pra você:",
      };
      return { intent, provider: data.provider ?? "groq" };
    },
  });
}
