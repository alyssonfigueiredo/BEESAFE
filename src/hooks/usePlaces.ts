import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { PublicPlace, PublicPlaceRating, WelcomingPlace } from "@/lib/types";
import type { Axis, PlaceCategory } from "@/theme/domain";

export function usePlaces(cityId: number | undefined) {
  return useQuery({
    queryKey: ["places", cityId],
    enabled: !!cityId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_places")
        .select("*")
        .eq("city_id", cityId!)
        .limit(1000);
      if (error) throw error;
      return data as PublicPlace[];
    },
  });
}

export function usePlace(id: string | undefined) {
  return useQuery({
    queryKey: ["place", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_places")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as PublicPlace;
    },
  });
}

export function usePlaceRatings(placeId: string | undefined) {
  return useQuery({
    queryKey: ["place-ratings", placeId],
    enabled: !!placeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_place_ratings")
        .select("*")
        .eq("place_id", placeId!)
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as PublicPlaceRating[];
    },
  });
}

export function useWelcoming(cityId: number | undefined, limit = 5) {
  return useQuery({
    queryKey: ["welcoming", cityId, limit],
    enabled: !!cityId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("welcoming_ranking", {
        p_city_id: cityId!,
        p_limit: limit,
      });
      if (error) throw error;
      return data as WelcomingPlace[];
    },
  });
}

const MESSAGES: Record<string, string> = {
  P0001: "Esse ponto está fora de um município cadastrado. Ajuste o marcador.",
  "23505": "Você já avaliou este lugar. Edite sua avaliação.",
  "23514": "Confira os campos: nome entre 2 e 80 letras, comentário até 500.",
  "42501": "Sua sessão expirou. Entre de novo.",
  P0002: "Limite diário atingido. Tente amanhã.",
  P0003: "Contas novas podem adicionar lugares após 24 horas.",
  // P0004 (lugar duplicado) fica de fora de propósito: a mensagem do banco nomeia o lugar
  // que já existe e a distância, e isso é mais útil do que qualquer texto fixo daqui.
};
const translate = (e: { code?: string; message: string }) =>
  new Error(MESSAGES[e.code ?? ""] ?? e.message);

export type NewPlace = {
  name: string;
  category: PlaceCategory;
  address: string;
  lat: number;
  lng: number;
};

export type SimilarPlace = {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string | null;
  neighborhood: string | null;
  distance_m: number;
  semelhanca: number;
};

/** Lugares parecidos perto do ponto escolhido, para oferecer o que já existe antes de criar outro. */
export function useSimilarPlaces(name: string, point: { lat: number; lng: number } | null) {
  const termo = name.trim();
  return useQuery({
    queryKey: ["places-similar", termo, point?.lat, point?.lng],
    enabled: termo.length >= 3 && !!point,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("places_similar", {
        p_name: termo,
        p_lat: point!.lat,
        p_lng: point!.lng,
      });
      if (error) throw error;
      return data as SimilarPlace[];
    },
  });
}

export function useCreatePlace() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewPlace) => {
      const { data, error } = await supabase
        .from("places")
        .insert({
          name: input.name.trim(),
          category: input.category,
          address: input.address.trim() || null,
          location: `SRID=4326;POINT(${input.lng} ${input.lat})`,
        })
        .select("id")
        .single();
      if (error) throw translate(error);
      return data.id as string;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["places"] });
      client.invalidateQueries({ queryKey: ["welcoming"] });
    },
  });
}

export type RatingInput = Record<Axis, number> & { comment: string };

export function useRatePlace(placeId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ comment, ...axes }: RatingInput) => {
      // `stars` é derivada dos eixos por trigger no banco.
      const { error } = await supabase
        .from("place_ratings")
        .upsert(
          { place_id: placeId, ...axes, comment: comment.trim() || null },
          { onConflict: "place_id,user_id" },
        );
      if (error) throw translate(error);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["place", placeId] });
      client.invalidateQueries({ queryKey: ["place-ratings", placeId] });
      client.invalidateQueries({ queryKey: ["places"] });
      client.invalidateQueries({ queryKey: ["welcoming"] });
    },
  });
}
