import { Image, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { useBustoResolvido } from "@/hooks/useIrisePersonagens";
import { BUNDLED_N } from "@/lib/irisePersonagens";
import { bustoEscuroSrc } from "@/lib/iriseImagensEscuras";

const ANEL_MINI = require("../../../assets/irise-personagens/anel-miniatura.png");

/** Aparece quando o card da cidade sai da tela (Início) e sempre nas outras abas. bottom = barra de abas + 16. */
export function IrisePilula({
  personagem,
  nome,
  visivel,
  bottom,
  onPress,
}: {
  personagem: number;
  nome: string;
  visivel: boolean;
  bottom: number;
  onPress: () => void;
}) {
  // Precisa ser chamado sempre (mesmo com !visivel), pra não variar a ordem dos hooks.
  const resolvido = useBustoResolvido(1, personagem);
  if (!visivel) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={{ position: "absolute", right: 14, bottom }}
    >
      <Pressable
        onPress={onPress}
        style={{
          height: 56,
          borderRadius: 28,
          paddingLeft: 6,
          paddingRight: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: "#171A2B",
          boxShadow: "0 12px 28px rgba(20,24,41,0.28)",
        }}
      >
        <View style={{ width: 44, height: 44 }}>
          <Image source={ANEL_MINI} style={{ position: "absolute", width: 44, height: 44 }} />
          <View
            style={{
              position: "absolute",
              left: 2,
              top: 2,
              width: 40,
              height: 40,
              borderRadius: 20,
              overflow: "hidden",
              backgroundColor: "#171A2B",
            }}
          >
            <Image
              source={BUNDLED_N.has(personagem) ? bustoEscuroSrc(1, personagem) : resolvido.source}
              onError={BUNDLED_N.has(personagem) ? undefined : resolvido.onError}
              style={{ position: "absolute", top: 0, left: -3.6, width: 47.2, height: 47.2 * (460 / 300) }}
            />
          </View>
        </View>
        <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 13, color: "#FFFFFF" }}>Falar com {nome}</Text>
      </Pressable>
    </Animated.View>
  );
}
