import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";

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

const FALLBACK = { name: "Porto Alegre", state: "RS" };

async function cityByName(name: string, state: string): Promise<City | null> {
  const { data } = await supabase
    .rpc("city_search", { p_name: name, p_state: state })
    .maybeSingle();
  return (data as City | null) ?? null;
}

export function CityProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [city, setCity] = useState<City | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("irisa.city");
        if (saved && !cancelled) {
          setCity(JSON.parse(saved) as City);
          return;
        }
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
          if (data && !cancelled) {
            setCity(data as City);
            return;
          }
        }
        const fallback = await cityByName(FALLBACK.name, FALLBACK.state);
        if (!cancelled) setCity(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return (
    <CityContext.Provider value={{ city, loading, userLocation, setCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  return useContext(CityContext);
}
