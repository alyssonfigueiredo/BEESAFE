import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ReportTarget } from "@/hooks/useModeration";
import { supabase } from "@/lib/supabase";

export type BlockedUser = { blocked_id: string; created_at: string };

/** Conteúdo com autoria visível: é o que some quando alguém é bloqueado. */
const AFFECTED_QUERIES = [["support-messages"], ["place-ratings"]];

export function useBlockedUsers() {
  return useQuery({
    queryKey: ["blocked-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("blocked_id, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BlockedUser[];
    },
  });
}

/** Bloqueia o autor de uma mensagem ou avaliação. O app nunca vê quem é: o banco resolve. */
export function useBlockAuthor() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, id }: { type: ReportTarget; id: string }) => {
      const { error } = await supabase.rpc("block_author", { p_type: type, p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      for (const key of [...AFFECTED_QUERIES, ["blocked-users"]]) {
        client.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useUnblockUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (blockedId: string) => {
      const { error } = await supabase.rpc("unblock_user", { p_blocked_id: blockedId });
      if (error) throw error;
    },
    onSuccess: () => {
      for (const key of [...AFFECTED_QUERIES, ["blocked-users"]]) {
        client.invalidateQueries({ queryKey: key });
      }
    },
  });
}
