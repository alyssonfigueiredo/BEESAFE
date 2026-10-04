import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";

type Notifications = typeof import("expo-notifications");

// O módulo nativo só existe em build feita depois da migration 38 (0.1.2 em diante). Este JS também
// chega por EAS Update em build antiga, e lá um import direto de expo-notifications derruba o app na
// abertura. Por isso o require só acontece depois de confirmar que o nativo está no aparelho.
function notifications(): Notifications | null {
  if (Platform.OS === "web") return null;
  if (!requireOptionalNativeModule("ExpoPushTokenManager")) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("expo-notifications") as Notifications;
}

let handlerPronto = false;

function abrirRota(N: Notifications, resposta: import("expo-notifications").NotificationResponse | null) {
  const url = resposta?.notification.request.content.data?.url;
  if (typeof url === "string" && url.startsWith("/")) {
    router.push(url as never);
  }
  N.clearLastNotificationResponse();
}

async function registrar(N: Notifications) {
  if (!handlerPronto) {
    // Com o app aberto, a notificação aparece como banner em vez de sumir calada.
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerPronto = true;
  }
  if (Platform.OS === "android") {
    await N.setNotificationChannelAsync("default", {
      name: "Avisos da Irisa",
      importance: N.AndroidImportance.DEFAULT,
    });
  }

  let { status } = await N.getPermissionsAsync();
  if (status === "undetermined") ({ status } = await N.requestPermissionsAsync());
  if (status !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const { data: token } = await N.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await supabase.rpc("register_push_token", { p_token: token, p_platform: Platform.OS });
}

/**
 * Pede a permissão de notificação uma vez (depois do login e da abertura animada), grava o token do
 * aparelho na conta e abre a tela que a notificação indicar ao ser tocada (`data.url`).
 */
export function usePush(userId: string | undefined, pronto: boolean) {
  useEffect(() => {
    if (!userId || !pronto) return;
    const N = notifications();
    if (!N) return;

    registrar(N).catch(() => {
      // Simulador, sem rede ou sem FCM no Android: segue sem push, o app não depende disso.
    });

    abrirRota(N, N.getLastNotificationResponse());
    const sub = N.addNotificationResponseReceivedListener((r) => abrirRota(N, r));
    return () => sub.remove();
  }, [userId, pronto]);
}
