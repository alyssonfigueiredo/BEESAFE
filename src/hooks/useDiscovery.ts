import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

import { queryClient } from "@/lib/query";
import { supabase } from "@/lib/supabase";
import type { PublicPlace } from "@/lib/types";
import { TOUR_CLOSED_AT_KEY } from "@/hooks/useTour";

// Descoberta ("Passou por aqui?", migration 43, docs/descoberta-proposta.html). Um cartão que sobe
// às vezes acima da barra de abas com um lugar perto e pouco avaliado. "Já fui" leva para a ficha de
// sempre, com o formulário de sempre: a origem vive só na rota (?origem=home_discovery) e em
// discovery_events. place_ratings não sabe de nada disso.

export const ORIGEM_DESCOBERTA = "home_discovery";

export type DiscoveryEvent =
  | "discovery_impression"
  | "discovery_place_opened"
  | "discovery_review_started"
  | "discovery_review_completed"
  | "discovery_dismissed"
  | "discovery_closed";

/** Grava o evento do funil. Falha calada: sem a migration, o app segue igual. */
export function logDescoberta(event: DiscoveryEvent, placeId: string, slot?: number) {
  supabase.rpc("discovery_log", { p_event: event, p_place: placeId, p_slot: slot ?? null }).then(
    () => {},
    () => {},
  );
}

/** Linha do topo do cartão: muda de um dia para o outro (e no segundo lugar do dia). */
export const OLHOS_DESCOBERTA = [
  "Passou por aqui?",
  "Conhece esse lugar?",
  "Já foi nesse?",
  "Esse ainda é um mistério",
];

/** Frase da volta, depois de avaliar. A mesma na folha de recompensa e no cartão aceso. */
export const FRASES_DESCOBERTA = [
  "Mais um pedacinho da cidade ganhou cor.",
  "Agora esse lugar tem um pouco mais de história.",
  "Valeu. Alguém vai escolher melhor por causa disso.",
];
export function fraseDescoberta(placeId: string) {
  let h = 0;
  for (let i = 0; i < placeId.length; i++) h = (h * 31 + placeId.charCodeAt(i)) | 0;
  return FRASES_DESCOBERTA[Math.abs(h) % FRASES_DESCOBERTA.length];
}

export function hojeSP() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

// ---------- uma vez por dia, e nunca logo depois do tour ----------
const KEY_DIA = "irisa.descoberta.dia";
const TOUR_FOLGA_MS = 30 * 60_000;

/** Se o cartão pode aparecer hoje neste aparelho (o banco também confere: X hoje ou 2 vistos = nada). */
export function useDescobertaHoje(enabled: boolean) {
  return useQuery({
    queryKey: ["descoberta-hoje"],
    enabled,
    retry: false,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const pares = await AsyncStorage.multiGet([KEY_DIA, TOUR_CLOSED_AT_KEY]).catch(
        () => [] as [string, string | null][],
      );
      const mapa = Object.fromEntries(pares);
      const fechadoEm = Number(mapa[TOUR_CLOSED_AT_KEY] ?? 0) || 0;
      return {
        pode: mapa[KEY_DIA] !== hojeSP() && Date.now() - fechadoEm > TOUR_FOLGA_MS,
        dia: new Date().getDate(),
      };
    },
  });
}

export function marcarDescobertaHoje() {
  AsyncStorage.setItem(KEY_DIA, hojeSP()).catch(() => {});
  queryClient.setQueryData(["descoberta-hoje"], (d: { pode: boolean; dia: number } | undefined) =>
    d ? { ...d, pode: false } : d,
  );
}

/** Até 2 lugares (o segundo só depois de "Não conheço"); vazio = nada hoje. */
export function useDiscoverySlate(
  enabled: boolean,
  cityId: number | null | undefined,
  loc: { lat: number; lng: number } | null,
) {
  // ~1 km de arredondamento: o GPS mexendo um pouco não refaz a escolha.
  const lat = loc ? Math.round(loc.lat * 100) / 100 : null;
  const lng = loc ? Math.round(loc.lng * 100) / 100 : null;
  return useQuery({
    queryKey: ["descoberta", cityId ?? null, lat, lng],
    enabled,
    retry: false,
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("discovery_slate", {
        p_lat: loc?.lat ?? null,
        p_lng: loc?.lng ?? null,
        p_city: cityId ?? null,
      });
      if (error) throw error;
      return (data ?? []) as PublicPlace[];
    },
  });
}

// ---------- pequenos estados compartilhados ----------
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => {
    ouvintes.delete(f);
  };
};

// Lugar avaliado a partir da descoberta: na volta, o cartão mostra esse lugar aceso.
let concluido: string | null = null;
export function marcarDescobertaConcluida(placeId: string) {
  concluido = placeId;
  avisar();
}
export function limparDescobertaConcluida() {
  if (concluido == null) return;
  concluido = null;
  avisar();
}
export function useDescobertaConcluida() {
  return useSyncExternalStore(assinar, () => concluido);
}

// Folhas e modais abertos: com qualquer um na tela, o cartão não aparece.
let folhas = 0;
/** Declare enquanto uma folha/modal estiver aberta (`useFolhaAberta(open)`). */
export function useFolhaAberta(aberta: boolean) {
  useEffect(() => {
    if (!aberta) return;
    folhas++;
    avisar();
    return () => {
      folhas--;
      avisar();
    };
  }, [aberta]);
}
export function useAlgumaFolhaAberta() {
  return useSyncExternalStore(assinar, () => folhas > 0);
}

// Quem passou pelo registro de relato nesta sessão não vê o cartão até a próxima: pedir avaliação
// logo depois de um relato é fora de hora.
let relatoNaSessao = false;
export function marcarRelatoNaSessao() {
  if (relatoNaSessao) return;
  relatoNaSessao = true;
  avisar();
}
export function useRelatoNaSessao() {
  return useSyncExternalStore(assinar, () => relatoNaSessao);
}

// O cartão aparece no máximo uma vez por sessão (e uma vez por dia, pelo aparelho e pelo banco).
let mostradoNaSessao = false;
export function marcarMostradoNaSessao() {
  mostradoNaSessao = true;
  avisar();
}
export function useMostradoNaSessao() {
  return useSyncExternalStore(assinar, () => mostradoNaSessao);
}
