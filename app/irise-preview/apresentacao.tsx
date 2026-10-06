import { router, Stack, useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Image, Pressable, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Aurora } from "@/components/Aurora";
import { CaixaDeFala } from "@/components/irise-personagem/CaixaDeFala";
import { useScreenInsets } from "@/hooks/useScreenInsets";
import { corpoSrc, FALAS_APRESENTACAO, flexionar, IRISES, type Forma } from "@/lib/irisePersonagens";
import { colors } from "@/theme/tokens";

/**
 * Prévia do personagem do irise — apresentação. Três falas, depois "BORA!" volta pro app de
 * verdade. Protótipo: nada grava (nem o personagem escolhido, nem o nome/pronome).
 */
export default function IrisePreviewApresentacao() {
  const insets = useScreenInsets({ tabs: false });
  const safe = useSafeAreaInsets();
  const { nome, forma: formaParam, irise: iriseParam } = useLocalSearchParams<{
    nome: string;
    forma: string;
    irise: string;
  }>();
  const forma = (Number(formaParam ?? 2) || 2) as Forma;
  const personagem = IRISES.find((p) => p.n === Number(iriseParam)) ?? IRISES[0];
  const [passo, setPasso] = useState(0);

  const fala = FALAS_APRESENTACAO[passo];
  const texto = flexionar(fala.texto, forma)
    .replace("{nome}", nome || "você")
    .replace("{irise}", personagem.nome);
  const ultimo = passo === FALAS_APRESENTACAO.length - 1;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 items-center justify-center">
        <Aurora />
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))}
          hitSlop={10}
          style={{ position: "absolute", top: safe.top + 10, left: 18, zIndex: 10 }}
          className="h-8 w-8 items-center justify-center rounded-full bg-subtle"
        >
          <X size={15} color={colors.ink} />
        </Pressable>
        <Animated.View
          key={personagem.n}
          entering={ZoomIn.duration(500)}
          style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "center" }}
        >
          <Image
            source={corpoSrc(fala.pose, personagem.n)}
            style={{ width: 260, height: 400 }}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          key={`dialogo-${passo}`}
          entering={FadeIn.duration(250)}
          style={{ position: "absolute", left: 16, right: 16, bottom: insets.paddingBottom + 16 }}
        >
          <CaixaDeFala
            nome="Irise desbloqueade"
            texto={texto}
            passos={FALAS_APRESENTACAO.length}
            passoAtual={passo}
            onAvancar={ultimo ? undefined : () => setPasso((p) => p + 1)}
            acoes={
              ultimo
                ? [{ label: "BORA!", onPress: () => router.replace("/(tabs)") }]
                : undefined
            }
          />
        </Animated.View>
      </View>
    </>
  );
}
