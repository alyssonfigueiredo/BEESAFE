import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { Busto } from "@/components/irise-personagem/Busto";
import { useProfile } from "@/hooks/useProfile";
import { IRISES } from "@/lib/irisePersonagens";
import { shadow } from "@/theme/tokens";

/**
 * Cartão do Perfil: o personagem do irise (avatar do chat). Sem XP, sem aparecer em outra tela —
 * só aqui pra trocar e no chat da Irise, que lê profiles.irise_personagem (migration 65).
 */
export function IriseCard() {
  const { data: profile } = useProfile();
  const atual = IRISES.find((p) => p.n === profile?.irise_personagem);

  function trocar() {
    router.push({
      pathname: "/irise-preview/escolha",
      params: { modo: "perfil", atual: atual ? String(atual.n) : "1", forma: "2" },
    });
  }

  return (
    <View className="flex-row items-center gap-4 rounded-[30px] bg-surface px-6 py-6" style={shadow.card}>
      {atual ? (
        <Busto personagem={atual.n} size={56} />
      ) : (
        <View className="h-[56px] w-[56px] items-center justify-center rounded-full bg-subtle">
          <Text className="font-body-bold text-xl text-dim">?</Text>
        </View>
      )}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-body-medium text-[17px] text-ink">
          {atual ? `${atual.nome} é seu irise` : "Escolha um irise"}
        </Text>
        <Text className="font-body text-[12.5px] leading-[17px] text-dim">
          {atual ? atual.classe : "Um personagem pra te acompanhar no chat da Irise."}
        </Text>
      </View>
      <Pressable onPress={trocar} className="rounded-full bg-subtle px-4 py-2.5 active:opacity-70">
        <Text className="font-body-bold text-[13px] text-ink">{atual ? "Trocar" : "Escolher"}</Text>
      </Pressable>
    </View>
  );
}
