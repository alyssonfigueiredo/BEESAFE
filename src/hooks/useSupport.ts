import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { SupportCategory } from "@/theme/domain";

export type SupportMessage = {
  id: string;
  nickname: string;
  category: SupportCategory;
  content: string;
  city_id: number | null;
  created_at: string;
  likes: number;
  liked: boolean;
};

export type SupportService = {
  id: number;
  name: string;
  kind: "policia" | "saude" | "direitos" | "acolhimento" | "ong" | "juridico";
  phone: string | null;
  url: string | null;
  description: string | null;
  city_id: number | null;
  state: string | null;
};

export function useSupportMessages() {
  return useQuery({
    queryKey: ["support-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_support_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SupportMessage[];
    },
  });
}

export function useSupportServices(cityId: number | undefined) {
  return useQuery({
    queryKey: ["support-services", cityId ?? 0],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("support_services_for", {
        p_city_id: cityId ?? null,
      });
      if (error) throw error;
      return data as SupportService[];
    },
  });
}

export function usePostSupportMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nickname: string;
      category: SupportCategory;
      content: string;
      cityId?: number;
    }) => {
      const { error } = await supabase.from("support_messages").insert({
        nickname: input.nickname.trim() || "Anônimo",
        category: input.category,
        content: input.content.trim(),
        city_id: input.cityId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["support-messages"] }),
  });
}

/** Like otimista com rollback. */
export function useToggleLike() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, liked }: { id: string; liked: boolean }) => {
      const { error } = liked
        ? await supabase.from("support_likes").delete().eq("message_id", id)
        : await supabase.from("support_likes").insert({ message_id: id });
      if (error) throw error;
    },
    onMutate: async ({ id, liked }) => {
      await client.cancelQueries({ queryKey: ["support-messages"] });
      const prev = client.getQueryData<SupportMessage[]>(["support-messages"]);
      client.setQueryData<SupportMessage[]>(["support-messages"], (old) =>
        old?.map((m) =>
          m.id === id ? { ...m, liked: !liked, likes: Number(m.likes) + (liked ? -1 : 1) } : m,
        ),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) client.setQueryData(["support-messages"], ctx.prev);
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["support-messages"] }),
  });
}
