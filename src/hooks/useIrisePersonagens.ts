import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { ImageSourcePropType } from "react-native";

import { supabase } from "@/lib/supabase";
import { BUNDLED_N, bustoSrc, IRISES, type Irise } from "@/lib/irisePersonagens";

type LinhaBanco = {
  n: number;
  nome: string;
  pronomes: string;
  classe: string;
  bio: string;
  stat_acolhimento: number;
  stat_humor: number;
  stat_papo_reto: number;
  stat_role: number;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
};

function paraIrise(l: LinhaBanco): Irise {
  return {
    n: l.n,
    nome: l.nome,
    pronomes: l.pronomes,
    classe: l.classe,
    bio: l.bio,
    stats: [l.stat_acolhimento, l.stat_humor, l.stat_papo_reto, l.stat_role],
  };
}

export const IRISE_PERSONAGENS_QUERY_KEY = ["irise-personagens"];

// Uma busca só, compartilhada: `useIrisePersonagens` e `useBustoResolvido` usam a mesma chave e
// cada um aplica o `select` que precisa, sem duplicar a requisição ao banco (o React Query junta
// `useQuery`s de chave igual, mesmo com `select` diferente).
function useIrisePersonagensCru() {
  return useQuery({
    queryKey: IRISE_PERSONAGENS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("irise_personagens")
        .select("*")
        .order("n");
      if (error) throw error;
      return data as LinhaBanco[];
    },
    staleTime: 5 * 60_000,
  });
}

/**
 * Catálogo de personagens do irise, administrável pelo painel sem build (migration 71). Os 9
 * originais ficam embutidos (`IRISES`) como ponto de partida — a tela nunca fica vazia enquanto
 * carrega, e segue funcionando offline — mas assim que o banco responde, ele é que manda: o que
 * estiver lá (incluindo edições nos 9 originais) é o que aparece.
 */
export function useIrisePersonagens() {
  return useQuery({
    queryKey: IRISE_PERSONAGENS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("irise_personagens")
        .select("*")
        .order("n");
      if (error) throw error;
      return data as LinhaBanco[];
    },
    select: (linhas) => linhas.map(paraIrise),
    placeholderData: IRISES.map((p) => ({
      n: p.n,
      nome: p.nome,
      pronomes: p.pronomes,
      classe: p.classe,
      bio: p.bio,
      stat_acolhimento: p.stats[0],
      stat_humor: p.stats[1],
      stat_papo_reto: p.stats[2],
      stat_role: p.stats[3],
      ativo: true,
      criado_em: "",
      atualizado_em: "",
    })),
    staleTime: 5 * 60_000,
  });
}

/** Linha crua (com `atualizado_em`/`criado_em`) de um personagem — usada só para decidir se vale
 * a pena tentar a foto do Storage antes da embutida (ver `useBustoResolvido`). */
function useLinhaBanco(personagem: number) {
  const { data } = useIrisePersonagensCru();
  return data?.find((l) => l.n === personagem);
}

function urlRemota(pose: number, personagem: number, versao?: string): string {
  const base = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  const v = versao ? `?v=${encodeURIComponent(versao)}` : "";
  return `${base}/storage/v1/object/public/irise/${personagem}/${pose}.webp${v}`;
}

/**
 * Resolve a imagem de um busto considerando que o admin pode ter trocado a foto pelo painel —
 * inclusive de um dos 9 personagens originais, cuja foto normalmente vem embutida no app.
 * - Personagem fora dos 9: sempre tenta o Storage (não tem versão embutida).
 * - Um dos 9: só tenta o Storage se a linha dele no banco já foi tocada (editada ou com
 *   `admin_irise_personagem_tocar` depois de subir foto nova) — do contrário usa a embutida
 *   direto, sem gastar uma requisição de rede à toa. Se o Storage falhar (lugar comum: ainda não
 *   tem foto nova lá, só o texto mudou), volta pra embutida sozinho.
 */
export function useBustoResolvido(pose: number, personagem: number) {
  const linha = useLinhaBanco(personagem);
  const [remotoFalhou, setRemotoFalhou] = useState(false);
  const embutido = BUNDLED_N.has(personagem);
  const tocado = !!linha && linha.atualizado_em !== linha.criado_em;
  const tentarRemoto = (!embutido || tocado) && !remotoFalhou;

  if (tentarRemoto) {
    const source: ImageSourcePropType = { uri: urlRemota(pose, personagem, linha?.atualizado_em) };
    return { source, onError: embutido ? () => setRemotoFalhou(true) : undefined };
  }
  return { source: bustoSrc(pose, personagem) as ImageSourcePropType, onError: undefined };
}

// ---------- admin ----------

export type IrisePersonagemAdmin = LinhaBanco;

/** Lista todos, inclusive inativos — só pra tela de admin (RPC já confere o papel). */
export function useAdminIrisePersonagens() {
  return useQuery({
    queryKey: ["admin-irise-personagens"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_irise_personagens");
      if (error) throw error;
      return data as IrisePersonagemAdmin[];
    },
  });
}

export type IrisePersonagemForm = {
  n: number;
  nome: string;
  pronomes: string;
  classe: string;
  bio: string;
  stats: [number, number, number, number];
  ativo: boolean;
};

function invalidarCatalogo(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({ queryKey: ["admin-irise-personagens"] });
  client.invalidateQueries({ queryKey: IRISE_PERSONAGENS_QUERY_KEY });
  client.invalidateQueries({ queryKey: ["irise-personagens-cru"] });
}

/** Cria (n novo) ou atualiza (n existente) um personagem inteiro. */
export function useAdminIrisePersonagemSalvar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (p: IrisePersonagemForm) => {
      const { data, error } = await supabase.rpc("admin_irise_personagem_upsert", {
        p_n: p.n,
        p_nome: p.nome.trim(),
        p_pronomes: p.pronomes.trim(),
        p_classe: p.classe.trim(),
        p_bio: p.bio.trim(),
        p_acolhimento: p.stats[0],
        p_humor: p.stats[1],
        p_papo_reto: p.stats[2],
        p_role: p.stats[3],
        p_ativo: p.ativo,
      });
      if (error) throw new Error(error.message);
      return data as IrisePersonagemAdmin;
    },
    onSuccess: () => invalidarCatalogo(client),
  });
}

export function useAdminIrisePersonagemExcluir() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (n: number) => {
      const { error } = await supabase.rpc("admin_irise_personagem_excluir", { p_n: n });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidarCatalogo(client),
  });
}

/** Sobe uma foto (pose 1 a 6) pro Storage e avisa o banco que a imagem desse personagem mudou
 * (vira a versão usada no `?v=` pra forçar o app a buscar de novo em vez de ficar com a antiga em
 * cache). Caminho `<personagem>/<pose>.webp`, igual ao que o app lê. */
export function useAdminIriseFotoEnviar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ personagem, pose, uri, tipo }: { personagem: number; pose: number; uri: string; tipo: string }) => {
      const caminho = `${personagem}/${pose}.webp`;
      const bytes = await (await fetch(uri)).arrayBuffer();
      const { error: erroUpload } = await supabase.storage
        .from("irise")
        .upload(caminho, bytes, { contentType: tipo || "image/webp", upsert: true });
      if (erroUpload) throw new Error(erroUpload.message);
      const { error } = await supabase.rpc("admin_irise_personagem_tocar", { p_n: personagem });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => invalidarCatalogo(client),
  });
}
