import { ChevronRight } from "lucide-react-native";
import { Image, Pressable, Text, View } from "react-native";

import { avatarCardSrc } from "@/lib/iriseImagensEscuras";

export function FaixaSempreOnline({ personagem, nome, onPress }: { personagem: number; nome: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
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
      <Image source={avatarCardSrc(5, personagem)} style={{ position: "absolute", left: 12, bottom: 10, width: 92, height: 120 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: "SpaceGrotesk_700Bold", fontSize: 10, letterSpacing: 1.4, color: "#49DCC0" }}>
          {nome} · SEMPRE ON-LINE
        </Text>
        <Text style={{ marginTop: 4, fontFamily: "SpaceGrotesk_400Regular", fontSize: 13, lineHeight: 17.5, color: "#FFFFFF" }}>
          Quer que eu ache um lugar tranquilo perto de você?
        </Text>
      </View>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#49DCC0", alignItems: "center", justifyContent: "center" }}>
        <ChevronRight size={16} strokeWidth={2.6} color="#141829" />
      </View>
    </Pressable>
  );
}
