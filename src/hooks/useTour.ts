import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";

// Tour de boas-vindas: aparece uma vez por aparelho, depois do login e da abertura animada.
// Enquanto ele está na tela, o pedido de notificação e a celebração de medalha esperam.

const KEY = "irisa.tour.v1";
export type TourEstado = "checando" | "aberto" | "fechado";

let estado: TourEstado = "checando";
let checado = false;
const ouvintes = new Set<() => void>();
function definir(e: TourEstado) {
  estado = e;
  ouvintes.forEach((f) => f());
}

/** Abre o tour de novo (Perfil → Rever o tour). */
export function abrirTour() {
  definir("aberto");
}

export function fecharTour() {
  definir("fechado");
  AsyncStorage.setItem(KEY, "1").catch(() => {});
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
