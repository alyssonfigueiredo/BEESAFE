import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type ReportTarget = "occurrence" | "place" | "rating" | "message";

export type QueueItem = {
  target_type: ReportTarget;
  target_id: string;
  reports: number;
  first_reported: string;
  reasons: string[];
  summary: string | null;
  current_status: "active" | "hidden" | "removed";
};

const MESSAGES: Record<string, string> = {
  "23505": "Você já denunciou este conteúdo.",
  P0002: "Limite diário de denúncias atingido.",
};

export function useReportContent() {
  return useMutation({
    mutationFn: async (input: { type: ReportTarget; id: string; reason: string }) => {
      const { error } = await supabase
        .from("content_reports")
        .insert({ target_type: input.type, target_id: input.id, reason: input.reason.trim() });
      if (error) throw new Error(MESSAGES[error.code ?? ""] ?? error.message);
    },
  });
}

export function useModerationQueue(enabled: boolean) {
  return useQuery({
    queryKey: ["moderation-queue"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("moderation_queue", { p_limit: 100 });
      if (error) throw error;
      return data as QueueItem[];
    },
  });
}

export function useModerate() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { type: ReportTarget; id: string; action: "remove" | "restore" }) => {
      const { error } = await supabase.rpc("moderate", {
        p_type: input.type,
        p_id: input.id,
        p_action: input.action,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["moderation-queue"] });
      client.invalidateQueries();
    },
  });
}
