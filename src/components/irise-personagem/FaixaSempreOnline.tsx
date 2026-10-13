import { ChevronRight } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import { IriseAvatar } from "@/components/irise-personagem/IriseAvatar";
import { useFotoTrocada } from "@/hooks/useIrisePersonagens";
import { avatarCardSrc } from "@/lib/iriseImagensEscuras";
import { BUNDLED_N } from "@/lib/irisePersonagens";

export function FaixaSempreOnline({ personagem, nome, onPress }: { personagem: number; nome: string; onPress: () => void }) {
  const fotoTrocada = useFotoTrocada(personagem);
  const usaEmbutido = BUNDLED_N.has(personagem) && !fotoTrocada;
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      style={{
        marginHorizontal: 12,
        marginVertical: 28,
        height: 96,
        borderRadius: 28,
        backgroundColor: "#171A2B",
        paddingVertical: 16,
        paddingRight: 16,
        paddingLeft: 118,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {usaEmbutido ? (
        <Image
          source={avatarCardSrc(5, personagem)}
          style={{ position: "absolute", left: 12, bottom: 10, width: 92, height: 120 }}
        />
      ) : (
        <View style={{ position: "absolute", left: 12, bottom: 10 }}>
          <IriseAvatar personagem={personagem} pose={5} size={92} fundo="escuro" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, letterSpacing: 1.4, color: "#49DCC0" }}>
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
