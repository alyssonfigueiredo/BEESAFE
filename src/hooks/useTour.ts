import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from "react-native";

// Tour de boas-vindas: aparece uma vez por aparelho, depois do login e da abertura animada.
// Enquanto ele está na tela, o pedido de notificação e a celebração de medalha esperam.
// v2 (04/10/2026): o tour acontece em cima das telas reais (holofote + borda que se desenha).
// Trocar a chave faz todo mundo ver de novo uma vez.

const KEY = "irisa.tour.v2";
/** Quando o tour foi fechado (ms). A descoberta não aparece logo depois dele. */
export const TOUR_CLOSED_AT_KEY = "irisa.tour.closedAt";
export type TourEstado = "checando" | "aberto" | "fechado";

let estado: TourEstado = "checando";
let checado = false;
let abertoNestaSessao = false;
const ouvintes = new Set<() => void>();
function definir(e: TourEstado) {
  estado = e;
  if (e === "aberto") abertoNestaSessao = true;
  ouvintes.forEach((f) => f());
}

/** Abre o tour de novo (Perfil → Rever o tour). */
export function abrirTour() {
  definir("aberto");
}

export function fecharTour() {
  definir("fechado");
  AsyncStorage.multiSet([
    [KEY, "1"],
    [TOUR_CLOSED_AT_KEY, String(Date.now())],
  ]).catch(() => {});
}

/** O tour apareceu nesta sessão do app (a descoberta espera a próxima). */
export function tourNestaSessao() {
  return abertoNestaSessao;
}

/** Estado do tour; na primeira vez com `ativo`, decide se abre pelo que ficou salvo no aparelho. */
export function useTour(ativo: boolean): TourEstado {
  useEffect(() => {
    if (!ativo || checado) return;
    checado = true;
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (estado === "checando") definir(v ? "fechado" : "aberto");
      })
      .catch(() => definir("fechado"));
  }, [ativo]);
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    () => estado,
  );
}

// ---------- alvos do tour ----------
// Cada coisa que o tour aponta se registra com um id (<TourTarget id="avaliar">, as abas pelo
// tabBarButton). O tour mede na hora, com measureInWindow, porque a tela pode ter rolado.

export type TourRect = { x: number; y: number; w: number; h: number };
// Um id pode ter mais de uma View: o botão de emergência existe no cabeçalho de cada aba, e as abas
// que não estão na frente ficam montadas mas escondidas. Vale a primeira que tiver tamanho na tela.
const alvos = new Map<string, Set<View>>();

/** Ref que registra a View como alvo do tour enquanto ela estiver montada. */
export function useTourTarget(id: string) {
  return useCallback(
    (node: View | null) => {
      if (!node) return;
      const set = alvos.get(id) ?? new Set<View>();
      set.add(node);
      alvos.set(id, set);
      return () => {
        set.delete(node);
        if (!set.size && alvos.get(id) === set) alvos.delete(id);
      };
    },
    [id],
  );
}

function medir(node: View): Promise<TourRect | null> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(null), 600);
    try {
      node.measureInWindow((x, y, w, h) => {
        clearTimeout(t);
        resolve(w > 2 && h > 2 ? { x, y, w, h } : null);
      });
    } catch {
      clearTimeout(t);
      resolve(null);
    }
  });
}

/** Retângulo do alvo na janela; null se não existe ou não tem tamanho (ex.: cartões sem dados). */
export async function medirAlvo(id: string): Promise<TourRect | null> {
  const nodes = [...(alvos.get(id) ?? [])].reverse();
  for (const node of nodes) {
    const r = await medir(node);
    if (r) return r;
  }
  return null;
}

// ---------- rolagem do Início ----------
// O tour leva o Início ao topo antes de começar e rola até um alvo que esteja fora da tela.
let rolagem: ScrollView | null = null;
let rolagemY = 0;

export function useTourScroll() {
  const anexar = useCallback((node: ScrollView | null) => {
    if (!node) return;
    rolagem = node;
    return () => {
      if (rolagem === node) rolagem = null;
    };
  }, []);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    rolagemY = e.nativeEvent.contentOffset.y;
  }, []);
  return { anexar, onScroll };
}

/** Rola o Início para `y` (0 = topo). */
export function rolarInicio(y: number, animated = true) {
  rolagem?.scrollTo({ y: Math.max(0, y), animated });
}
export function rolagemInicioAtual() {
  return rolagemY;
}
