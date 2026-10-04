import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";

import { supabase } from "@/lib/supabase";
import type { Banho } from "@/lib/medals";
import type { PublicPlace } from "@/lib/types";
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

/** Quanto falta para a medalha sair (na unidade dela). */
export function faltam(m: MedalhaProgresso) {
  return Math.max(0, m.alvo - m.valor);
}

const SINGULAR: Record<string, string> = {
  avaliações: "avaliação",
  semanas: "semana",
  lugares: "lugar",
  bairros: "bairro",
  cidades: "cidade",
  dias: "dia",
  mensagens: "mensagem",
};
/** "1 avaliação", "2 avaliações": a unidade que vem do banco no plural, ajustada ao número. */
export function unidadeTexto(unidade: string | undefined, n: number) {
  if (!unidade) return "";
  return n === 1 ? (SINGULAR[unidade] ?? unidade) : unidade;
}

/** "Faltam 2 avaliações" / "Falta 1 semana". */
export function faltamTexto(m: MedalhaProgresso) {
  const n = faltam(m);
  return `${n === 1 ? "Falta" : "Faltam"} ${n}${m.unidade ? ` ${unidadeTexto(m.unidade, n)}` : ""}`;
}

/** O botão de cada medalha: o que a pessoa faz para chegar nela. null = não há o que fazer agora. */
export function ctaDa(id: string): { label: string; href: string } | null {
  if (id === "abre-alas" || id === "bateu-ponto" || id === "ja-mora-aqui") return null;
  if (id === "ombro-amigo") return { label: "Escrever no mural", href: "/apoio" };
  if (id === "eu-conheco") return { label: "Cadastrar um lugar", href: "/registrar?modo=lugar" };
  return { label: "Avaliar um lugar perto", href: "/lugares" };
}

/** As bloqueadas mais perto de sair, da mais perto para a mais longe (sem as de um passo só). */
export function proximas(g: Gamificacao | null | undefined, excluir: string[] = [], n = 2) {
  if (!g) return [];
  const feitas = new Set(g.conquistadas.map((c) => c.id));
  return g.medalhas
    .filter((m) => !m.ok && !feitas.has(m.id) && !excluir.includes(m.id) && m.alvo > 1)
    .sort((a, b) => b.valor / b.alvo - a.valor / a.alvo)
    .slice(0, n);
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
/** Hoje em Brasília, "AAAA-MM-DD" (o mesmo dia que o banco usa em irisa_today()). */
export function hojeSP() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}
const hoje = hojeSP;
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
    client.invalidateQueries({ queryKey: ["gamificacao-semana"] });
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        trackDay("open");
        client.invalidateQueries({ queryKey: ["gamificacao"] });
        client.invalidateQueries({ queryKey: ["gamificacao-semana"] });
      }
    });
    return () => sub.remove();
  }, [session, client]);
}

// ---------- como o app fala com a pessoa (Perfil) ----------
export type Forma = 0 | 1 | 2;
/** 0 = a, 1 = o, 2 = e. Vale para o app inteiro; sem a gamificação no banco, "e". */
export function useForma(): Forma {
  const { data } = useGamification();
  const f = data?.forma;
  return f === 0 || f === 1 || f === 2 ? f : 2;
}
/** flexWord(forma, "recebid") → recebida / recebido / recebide. */
export function flexWord(forma: number, base: string) {
  return base + (["a", "o", "e"][forma] ?? "e");
}

// ---------- detalhe da semana e da cidade (migration 43) ----------
export type DiaQueContou = { dia: string; consultou: boolean; apoiou: boolean; avaliacoes: number };
export type MinhaSemana = { dias: DiaQueContou[]; semanas: { inicio: string; dias: number }[] };

/** Só os dias que contaram nesta semana e quantos dias teve cada uma das 5 anteriores. */
export function useMyWeek(enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["gamificacao-semana"],
    enabled: !!session && enabled,
    retry: false,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_week");
      if (error) throw error;
      return (data ?? { dias: [], semanas: [] }) as MinhaSemana;
    },
  });
}

/** Os 100 lugares mais conhecidos da cidade (o denominador do "N de 100"). */
export function useCityTopPlaces(cityId: number | null | undefined, enabled = true) {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["cidade-top", cityId ?? null],
    enabled: !!session && !!cityId && enabled,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("city_top_places", { p_city: cityId! });
      if (error) throw error;
      return (data ?? []) as PublicPlace[];
    },
  });
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
