import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { PublicPlace } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

// Quero ir (migration 65): os lugares que a pessoa quer conhecer. Só ela vê. Avaliou um lugar da
// lista, o banco marca `visitado_em` e ele aparece em "Já fui". Sem a migration no banco, a lista
// volta vazia e o coração some (o app segue igual).

export type Favorito = { place_id: string; created_at: string; visitado_em: string | null };

const KEY = ["favoritos"] as const;

export function useFavoritos() {
  const { session } = useAuth();
  return useQuery({
    queryKey: KEY,
    enabled: !!session,
    staleTime: 60_000,
    queryFn: async (): Promise<Favorito[] | null> => {
      const { data, error } = await supabase
        .from("place_favorites")
        .select("place_id, created_at, visitado_em")
        .order("created_at", { ascending: false });
      // Tabela ainda não existe no banco: o recurso fica desligado em vez de quebrar a tela.
      if (error) return null;
      return data as Favorito[];
    },
  });
}

/** Está no Quero ir (salvo e ainda não avaliado)? `null` quando o recurso não existe no banco. */
export function useNaLista(placeId: string | undefined): boolean | null {
  const { data } = useFavoritos();
  if (data == null || !placeId) return data == null ? null : false;
  return data.some((f) => f.place_id === placeId && !f.visitado_em);
}

export function useToggleFavorito() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ placeId, on }: { placeId: string; on: boolean }) => {
      if (on) {
        // Salvar de novo um lugar de "Já fui" devolve ele para "Quero ir".
        const { error } = await supabase
          .from("place_favorites")
          .upsert({ place_id: placeId, visitado_em: null }, { onConflict: "user_id,place_id" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("place_favorites").delete().eq("place_id", placeId);
        if (error) throw error;
      }
    },
    onMutate: async ({ placeId, on }) => {
      await client.cancelQueries({ queryKey: KEY });
      const antes = client.getQueryData<Favorito[] | null>(KEY);
      client.setQueryData<Favorito[] | null>(KEY, (lista) => {
        const base = (lista ?? []).filter((f) => f.place_id !== placeId);
        return on
          ? [
              { place_id: placeId, created_at: new Date().toISOString(), visitado_em: null },
              ...base,
            ]
          : base;
      });
      return { antes };
    },
    onError: (_e, _v, ctx) => client.setQueryData(KEY, ctx?.antes),
    onSettled: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

/** Os lugares da lista, completos (para a tela Quero ir e a camada do mapa). */
export function useLugaresFavoritos() {
  const { data: favs } = useFavoritos();
  const ids = (favs ?? []).map((f) => f.place_id);
  return useQuery({
    queryKey: ["favoritos-lugares", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("public_places").select("*").in("id", ids);
      if (error) throw error;
      const porId = new Map((data as PublicPlace[]).map((p) => [p.id, p]));
      return (favs ?? [])
        .filter((f) => porId.has(f.place_id))
        .map((f) => ({ ...f, place: porId.get(f.place_id)! }));
    },
  });
}
