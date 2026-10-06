import { router } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

import { HeartIcon } from "@/components/FavHeart";
import { useFavoritos } from "@/hooks/useFavoritos";
import { colors, shadow } from "@/theme/tokens";

// Atalhos para a lista Quero ir: fora da barra de baixo, de propósito (pedido do Leandro).
// Um chip no começo dos filtros da aba Lugares e um cartão no Perfil. Sem a migration 65 no
// banco, os dois somem.

export function QueroIrChip() {
  const { data: favs } = useFavoritos();
  if (favs == null) return null;
  const n = favs.filter((f) => !f.visitado_em).length;
  return (
    <Pressable
      onPress={() => router.push("/quero-ir")}
      accessibilityRole="button"
      accessibilityLabel={`Quero ir, ${n} ${n === 1 ? "lugar" : "lugares"}`}
      className="h-9 flex-row items-center gap-1.5 rounded-full bg-solid pl-2.5 pr-3.5 active:opacity-80"
      style={shadow.card}
    >
      <HeartIcon on size={17} />
      <Text className="font-body-bold text-[13.5px] text-ink">Quero ir</Text>
      <Text className="font-body-medium text-[13px] text-dim">{n}</Text>
    </Pressable>
  );
}

export function QueroIrCard() {
  const { data: favs } = useFavoritos();
  if (favs == null) return null;
  const quero = favs.filter((f) => !f.visitado_em).length;
  const fui = favs.length - quero;
  return (
    <Pressable
      onPress={() => router.push("/quero-ir")}
      className="flex-row items-center gap-3.5 rounded-[30px] bg-surface px-5 py-4 active:opacity-90"
      style={shadow.card}
    >
      <View
        className="h-[54px] w-[54px] items-center justify-center rounded-full"
        style={{ backgroundColor: "#FFF4F6" }}
      >
        <HeartIcon on size={30} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-body-medium text-[17px] text-ink">Quero ir</Text>
        <Text className="font-body text-[13px] text-muted">
          {quero === 0
            ? "Toque no coração de um lugar para guardar aqui."
            : `${quero} ${quero === 1 ? "lugar" : "lugares"} para conhecer`}
          {fui > 0 ? ` · ${fui} já ${fui === 1 ? "visitado" : "visitados"}` : ""}
        </Text>
        <Text className="font-body text-[11.5px] text-dim">Só você vê.</Text>
      </View>
      <ChevronRight color={colors.dim} size={20} />
    </Pressable>
  );
}
