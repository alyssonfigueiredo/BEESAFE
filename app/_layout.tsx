import "../global.css";

import { Oswald_500Medium, Oswald_700Bold } from "@expo-google-fonts/oswald";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { Urbanist_500Medium } from "@expo-google-fonts/urbanist";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { queryClient } from "@/lib/query";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { Splash } from "@/components/Splash";
import { SubiuDeNivel } from "@/components/gami/Evolucao";
import { MedalCelebration } from "@/components/gami/MedalCelebration";
import { Tour } from "@/components/Tour";
import { useTrackOpen } from "@/hooks/useGamification";
import { usePush } from "@/hooks/usePush";
import { useTour } from "@/hooks/useTour";
import { CityProvider } from "@/providers/CityProvider";
import { colors } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

function RootNavigator({ pronto }: { pronto: boolean }) {
  const { session, loading } = useAuth();
  // Tour de boas-vindas uma vez por aparelho, depois do login e da abertura animada.
  const tour = useTour(!!session && pronto);
  // Pedido de notificação só depois da abertura animada e do tour, para não aparecer por cima deles.
  usePush(session?.user.id, pronto && tour === "fechado");
  // Gamificação: marca o dia em que a pessoa abriu o app (só a data) e celebra medalha nova.
  useTrackOpen();
  if (loading) return null;
  return (
    <>
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}
      >
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lugar/[id]" />
          <Stack.Screen name="moderacao" />
          <Stack.Screen name="conquistas" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        {/* Fora dos guards (o retorno do login chega sem sessão), mas por último: a primeira tela da
          lista vira a rota inicial, e esta nunca pode ser a de abertura do app. */}
        <Stack.Screen name="auth/callback" />
      </Stack>
      {session && pronto && tour === "fechado" && <MedalCelebration />}
      {session && pronto && tour === "fechado" && <SubiuDeNivel />}
      {/* Tour por cima das telas reais (holofote): monta do zero a cada abertura. */}
      {!!session && pronto && tour === "aberto" && <Tour />}
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Oswald_500Medium,
    Oswald_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Urbanist_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // O splash nativo (estático) dá lugar ao radar animado assim que as fontes carregam.
  const [abrindo, setAbrindo] = useState(true);
  const fecharSplash = useCallback(() => setAbrindo(false), []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <CityProvider>
              <StatusBar style="dark" />
              <RootNavigator pronto={!abrindo} />
              {abrindo && <Splash onDone={fecharSplash} />}
            </CityProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
