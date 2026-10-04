import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { supabase } from "@/lib/supabase";
import type { Banho } from "@/lib/medals";
import { useAuth } from "@/providers/AuthProvider";
import { useCity } from "@/providers/CityProvider";

// Gamificação (migration 39). Tudo aqui é acréscimo: se a migration ainda não estiver no banco, as
// chamadas falham caladas e os cartões novos simplesmente não aparecem — o resto do app segue igual.

export type MedalhaProgresso = {
  id: string;
  valor: number;
  alvo: number;
  ok: boolean;
  unidade?: string;
};
export type Conquistada = { id: string; em: string; visto: boolean; banho: Banho | null };
export type Gamificacao = {
  gomos: number;
  nivel: number;
  avaliacoes: number;
  /** Gomos acesos nesta semana (migration 40; cada semana acende no máximo `gomos_semana_max`). */
  gomos_semana?: number;
  gomos_semana_max?: number;
  semana: { dias: number; acesa: boolean; extra: number };
  semanas_acesas: number;
  faiscas: { total: number; rumo: number };
  caixinhas: number;
  medalhas: MedalhaProgresso[];
  forma: 0 | 1 | 2;
  conquistadas: Conquistada[];
  cidade: { cidade: number; total: number; com_selo: number; semana: number } | null;
};

export function useGamification() {
  const { session } = useAuth();
  const { city } = useCity();
  return useQuery({
    queryKey: ["gamificacao", city?.id ?? null],
    enabled: !!session,
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_gamification", { p_city: city?.id ?? null });
      if (error) throw error;
      return data as Gamificacao | null;
    },
  });
}

/** "3 de 15 avaliações", "2 de 3 semanas". */
export function progressoTexto(m: MedalhaProgresso) {
  return `${m.valor} de ${m.alvo}${m.unidade ? ` ${m.unidade}` : ""}`;
}

/** A medalha bloqueada mais perto de sair, para o cartão "Quase lá". */
export function quaseLa(g: Gamificacao | null | undefined) {
  if (!g) return null;
  return (
    g.medalhas
      .filter((m) => !m.ok && m.valor > 0 && m.valor < m.alvo && m.alvo > 1)
      .sort((a, b) => b.valor / b.alvo - a.valor / a.alvo)[0] ?? null
  );
}

// ---------- dias: abrir o app e consultar um lugar ----------
const marcados = new Set<string>();
function hoje() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
export function trackDay(kind: "open" | "consult") {
  const chave = `${kind}:${hoje()}`;
  if (marcados.has(chave)) return;
  marcados.add(chave);
  supabase.rpc("track_day", { p_kind: kind }).then(({ error }) => {
    if (error) marcados.delete(chave);
  });
}

/** Marca o dia ao abrir o app e toda vez que ele volta para a frente. */
export function useTrackOpen() {
  const { session } = useAuth();
  const client = useQueryClient();
  useEffect(() => {
    if (!session) return;
    trackDay("open");
    client.invalidateQueries({ queryKey: ["gamificacao"] });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        trackDay("open");
        client.invalidateQueries({ queryKey: ["gamificacao"] });
      }
    });
    return () => sub.remove();
  }, [session, client]);
}

// ---------- ações ----------
export function useSetMedalForm() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (forma: 0 | 1 | 2) => {
      const { error } = await supabase.rpc("set_medal_form", { p_form: forma });
      if (error) throw error;
    },
    onMutate: (forma) => {
      client.setQueriesData<Gamificacao | null>({ queryKey: ["gamificacao"] }, (g) =>
        g ? { ...g, forma } : g,
      );
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["gamificacao"] }),
  });
}

export function useMarkSeen() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.rpc("mark_medals_seen", { p_ids: ids });
      if (error) throw error;
    },
    onMutate: (ids) => {
      client.setQueriesData<Gamificacao | null>({ queryKey: ["gamificacao"] }, (g) =>
        g
          ? {
              ...g,
              conquistadas: g.conquistadas.map((c) =>
                ids.includes(c.id) ? { ...c, visto: true } : c,
              ),
            }
          : g,
      );
    },
  });
}

export function useOpenBox() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("open_box");
      if (error) throw error;
      return data as { medalha: string; banho: Banho };
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["gamificacao"] }),
  });
}

export type Aviso = { ativo: boolean; titulo: string; texto: string; url: string | null };
/** Aviso no Início, editado pelo painel (app_settings). */
export function useAppConfig() {
  return useQuery({
    queryKey: ["app-config"],
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("app_config");
      if (error) throw error;
      return (data ?? {}) as { aviso?: Aviso };
    },
  });
}

// ---------- quem está na tela agora ----------
// A celebração de medalha espera a folha de recompensa da avaliação fechar.
let folhaAberta = false;
const ouvintes = new Set<() => void>();
export function setRewardOpen(v: boolean) {
  folhaAberta = v;
  ouvintes.forEach((f) => f());
}
export function useRewardOpen() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => folhaAberta,
  );
}
