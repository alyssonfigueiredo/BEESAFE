import AsyncStorage from "@react-native-async-storage/async-storage";
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
export function trackDay(kind: "open" | "consult" | "bairro") {
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

/** Lugar da meta da cidade; `meu` = a pessoa já avaliou (não dá para convidar de novo). */
export type LugarDaMeta = PublicPlace & { meu: boolean };

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
      const lugares = (data ?? []) as PublicPlace[];
      // Sem a migration 45, ninguém aparece como avaliado: só perde o filtro.
      const meus = await supabase.rpc("my_rated_places", { p_ids: lugares.map((p) => p.id) });
      const ids = new Set((meus.error ? [] : ((meus.data ?? []) as string[])).map(String));
      return lugares.map((p) => ({ ...p, meu: ids.has(p.id) })) as LugarDaMeta[];
    },
  });
}

/**
 * Convites da meta da cidade, só entre os lugares que a pessoa ainda não avaliou:
 * `perto` = já têm de 1 a 4 avaliações (o mais perto do selo primeiro); `virgens` = ninguém avaliou
 * (na ordem dos mais conhecidos). `proximo` é o que o cartão do Início aponta.
 */
export function convitesDaCidade(lugares: LugarDaMeta[] | undefined, minimo: number) {
  const livres = (lugares ?? []).filter((p) => !p.meu);
  const perto = livres
    .filter((p) => p.rating_count >= 1 && p.rating_count < minimo)
    .sort((a, b) => b.rating_count - a.rating_count);
  const virgens = livres.filter((p) => p.rating_count === 0);
  return { perto, virgens, proximo: perto[0] ?? null };
}

// ---------- suas cores (migration 47) ----------
export type MinhaCor = {
  id: string;
  nome: string;
  categoria: import("@/theme/domain").PlaceCategory;
  bairro: string | null;
  lat: number;
  lng: number;
  nota: number;
  primeira: boolean;
  selo: boolean;
};
export type MinhasCores = {
  lugares: number;
  primeiras: number;
  selos: number;
  bairros: number;
  ajudou: number;
  ultimo_selo: string | null;
  ultima_primeira: string | null;
  itens: MinhaCor[];
};

/** O que a pessoa fez: lugares avaliados, primeiras cores, selos, bairros, quantos ajudou. */
export function useMinhasCores() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["cores"],
    enabled: !!session,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_cores");
      if (error) return null; // sem a migration 47 o cartão some calado
      return data as MinhasCores;
    },
  });
}

// Cada lugar conta uma vez por aparelho: o número do "ajudou" fica perto de "pessoas", não de
// "aberturas". Guarda só ids de lugar no próprio aparelho, nada vai junto com a pessoa para o banco.
const VISTOS_KEY = "irisa.vistos.v1";
let vistos: Set<string> | null = null;
export async function logVistaDeLugar(placeId: string) {
  try {
    if (!vistos) {
      const salvo = await AsyncStorage.getItem(VISTOS_KEY);
      vistos = new Set(salvo ? (JSON.parse(salvo) as string[]) : []);
    }
    if (vistos.has(placeId)) return;
    vistos.add(placeId);
    const lista = [...vistos].slice(-3000);
    vistos = new Set(lista);
    await AsyncStorage.setItem(VISTOS_KEY, JSON.stringify(lista));
    await supabase.rpc("log_place_view", { p_place: placeId });
  } catch {
    // contagem é bônus: falhar não atrapalha a ficha
  }
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
      return (data ?? {}) as { aviso?: Aviso; irise_ativa?: boolean };
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
