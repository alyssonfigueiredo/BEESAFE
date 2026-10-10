import { ChevronRight } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import { IriseAvatar } from "@/components/irise-personagem/IriseAvatar";
import { useFotoTrocada } from "@/hooks/useIrisePersonagens";
import { avatarCardSrc } from "@/lib/iriseImagensEscuras";
import { BUNDLED_N } from "@/lib/irisePersonagens";

const FAIXA_ALTURA = 96;
const AVATAR_BAIXO = 10;
// Mesma regra do cartão da cidade: só um pouco da cabeça passa da borda (no máximo 14 px).
const AVATAR_ALTURA = FAIXA_ALTURA - AVATAR_BAIXO + 14;
const AVATAR_LARGURA = Math.round((AVATAR_ALTURA * 108) / 140);

export function FaixaSempreOnline({ personagem, nome, onPress }: { personagem: number; nome: string; onPress: () => void }) {
  const fotoTrocada = useFotoTrocada(personagem);
  const usaEmbutido = BUNDLED_N.has(personagem) && !fotoTrocada;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          marginHorizontal: 12,
          marginTop: 24,
          marginBottom: 24,
          height: FAIXA_ALTURA,
          borderRadius: 28,
          backgroundColor: "#171A2B",
          paddingVertical: 16,
          paddingRight: 16,
          paddingLeft: 118,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {usaEmbutido ? (
        <Image source={avatarCardSrc(5, personagem)} style={{ position: "absolute", left: 12, bottom: AVATAR_BAIXO, width: AVATAR_LARGURA, height: AVATAR_ALTURA }} />
      ) : (
        <View style={{ position: "absolute", left: 12, bottom: AVATAR_BAIXO }}>
          <IriseAvatar personagem={personagem} pose={5} size={AVATAR_ALTURA / 1.24} fundo="escuro" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, letterSpacing: 1.2, color: "#49DCC0" }}>
          {nome} · SEMPRE ON-LINE
        </Text>
        <Text numberOfLines={3} style={{ marginTop: 4, fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 17.5, color: "#FFFFFF" }}>
          Quer que eu ache um lugar tranquilo perto de você?
        </Text>
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#49DCC0", alignItems: "center", justifyContent: "center" }}>
        <ChevronRight size={16} strokeWidth={2.6} color="#141829" />
      </View>
    </Pressable>
  );
}
