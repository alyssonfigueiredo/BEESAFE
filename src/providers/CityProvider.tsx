import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";

import { supabase } from "@/lib/supabase";
import type { City } from "@/lib/types";
import { useAuth } from "./AuthProvider";

type CityState = {
  city: City | null;
  loading: boolean;
  userLocation: { lat: number; lng: number } | null;
  setCity: (city: City) => void;
};

const CityContext = createContext<CityState>({
  city: null,
  loading: true,
  userLocation: null,
  setCity: () => {},
});

const FALLBACK = { name: "Curitiba", state: "PR" };

async function cityByName(name: string, state: string): Promise<City | null> {
  const { data } = await supabase
    .rpc("city_search", { p_name: name, p_state: state })
    .maybeSingle();
  return (data as City | null) ?? null;
}

const STORAGE_KEY = "irisa.city";

type Owned = { uid: string; city: City | null; loaded: boolean };

export function CityProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  // A cidade pertence ao usuário que a escolheu: ao trocar de conta nada da anterior aparece.
  const [owned, setOwned] = useState<Owned | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const mine = owned && owned.uid === uid ? owned : null;
  const city = mine?.city ?? null;
  const loading = !!uid && !mine?.loaded;

  const setCity = useCallback(
    (c: City) => {
      if (!uid) return;
      setOwned({ uid, city: c, loaded: true });
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(c)).catch(() => {});
    },
    [uid],
  );

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const done = (c: City | null) => {
      if (!cancelled) setOwned({ uid, city: c, loaded: true });
    };
    (async () => {
      let result: City | null = null;
      try {
        // 1. escolha salva
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          result = JSON.parse(saved) as City;
          return;
        }
        // 2. cidade padrão do perfil
        const prof = await supabase
          .from("profiles")
          .select("default_city_id, cities:default_city_id (id, name, state)")
          .eq("id", uid)
          .maybeSingle();
        const pc = (
          prof.data as { cities?: { id: number; name: string; state: string } | null } | null
        )?.cities;
        if (pc) {
          const { data } = await supabase.rpc("city_search", {
            p_name: pc.name,
            p_state: pc.state,
          });
          const found = ((data as City[] | null) ?? []).find((c) => c.id === pc.id);
          if (found) {
            result = found;
            return;
          }
        }
        // 3. GPS
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          if (!cancelled) setUserLocation(loc);
          const { data } = await supabase
            .rpc("city_at", { p_lat: loc.lat, p_lng: loc.lng })
            .maybeSingle();
          if (data) {
            result = data as City;
            return;
          }
        }
        // 4. Curitiba
        result = await cityByName(FALLBACK.name, FALLBACK.state);
      } catch {
        // cai no que já tiver sido resolvido
      } finally {
        done(result);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <CityContext.Provider value={{ city, loading, userLocation, setCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  return useContext(CityContext);
}
