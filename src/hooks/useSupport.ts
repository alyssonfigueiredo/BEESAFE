import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { SupportCategory } from "@/theme/domain";

/** Reações da casa no mural (migration 43). Uma por pessoa por recado. */
export const REACTION_KINDS = ["abraco", "arrasou", "contigo", "sinto", "acendeu", "cor"] as const;
export type ReactionKind = (typeof REACTION_KINDS)[number];

export type SupportMessage = {
  id: string;
  nickname: string;
  category: SupportCategory;
  content: string;
  city_id: number | null;
  created_at: string;
  /** Total de reações (o nome ficou da curtida antiga). */
  likes: number;
  /** Eu reagi. */
  liked: boolean;
  is_mine: boolean;
  /** {tipo: quantas}. Sem a migration 43 no banco, vem undefined. */
  reactions?: Partial<Record<ReactionKind, number>> | null;
  my_reaction?: ReactionKind | null;
  /** Id da pergunta da semana que o recado responde. */
  prompt?: string | null;
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

export type WeeklyQuestion = { ativa: boolean; id: string; texto: string };

const MESSAGES_KEY = ["support-messages"];

export function useSupportMessages() {
  return useQuery({
    queryKey: MESSAGES_KEY,
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

/** Quantos recados no ar nos últimos 7 dias (o chip do cabeçalho). */
export function useWeekMessageCount() {
  return useQuery({
    queryKey: ["support-messages", "week-count"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("public_support_messages")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/**
 * Pergunta da semana e quantas pessoas responderam. Mesma RPC do useAppConfig, chave própria
 * (o mural invalida depois de responder sem mexer no aviso do Início). Sem a migration 43,
 * `pergunta` vem null e o cartão some.
 */
export function useWeeklyQuestion() {
  return useQuery({
    queryKey: ["app-config", "mural"],
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("app_config");
      if (error) throw error;
      const cfg = (data ?? {}) as {
        pergunta_semana?: Partial<WeeklyQuestion> | null;
        pergunta_respostas?: number | null;
      };
      const q = cfg.pergunta_semana;
      const pergunta: WeeklyQuestion | null =
        q && q.ativa && q.id && q.texto?.trim()
          ? { ativa: true, id: q.id, texto: q.texto.trim() }
          : null;
      return { pergunta, respostas: Number(cfg.pergunta_respostas ?? 0) };
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
      /** Publica como "Anônimo", sem apelido. */
      anonymous?: boolean;
      /** Id da pergunta da semana, quando o recado responde a ela. */
      prompt?: string | null;
    }) => {
      const row: Record<string, unknown> = {
        nickname: input.anonymous ? "Anônimo" : input.nickname.trim() || "Anônimo",
        category: input.category,
        content: input.content.trim(),
        city_id: input.cityId ?? null,
      };
      if (input.prompt) row.prompt = input.prompt;
      // Sem .select(): a tabela-base não tem policy de leitura; o recado volta pela view.
      const { error } = await supabase.from("support_messages").insert(row);
      if (error) throw error;
    },
    onSuccess: (_d, input) => {
      client.invalidateQueries({ queryKey: MESSAGES_KEY });
      client.invalidateQueries({ queryKey: ["gamificacao"] });
      if (input.prompt) client.invalidateQueries({ queryKey: ["app-config"] });
    },
  });
}

/** Reação otimista: tocar na mesma reação de novo tira. Rollback se o banco recusar. */
export function useReactSupport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: ReactionKind | null }) => {
      const { error } = await supabase.rpc("react_support", { p_message: id, p_kind: kind });
      if (error) throw error;
    },
    onMutate: async ({ id, kind }) => {
      await client.cancelQueries({ queryKey: MESSAGES_KEY, exact: true });
      const prev = client.getQueryData<SupportMessage[]>(MESSAGES_KEY);
      client.setQueryData<SupportMessage[]>(MESSAGES_KEY, (old) =>
        old?.map((m) => (m.id === id ? applyReaction(m, kind) : m)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) client.setQueryData(MESSAGES_KEY, ctx.prev);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: MESSAGES_KEY, exact: true });
      client.invalidateQueries({ queryKey: ["gamificacao"] });
    },
  });
}

function applyReaction(m: SupportMessage, kind: ReactionKind | null): SupportMessage {
  const reactions = { ...(m.reactions ?? {}) };
  const before = m.my_reaction ?? null;
  if (before) {
    const n = (reactions[before] ?? 1) - 1;
    if (n > 0) reactions[before] = n;
    else delete reactions[before];
  }
  if (kind) reactions[kind] = (reactions[kind] ?? 0) + 1;
  const likes = Number(m.likes) + (kind ? 1 : 0) - (before ? 1 : 0);
  return { ...m, reactions, my_reaction: kind, liked: !!kind, likes: Math.max(0, likes) };
}
