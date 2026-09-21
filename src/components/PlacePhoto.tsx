import {
  Beer,
  BedDouble,
  Coffee,
  Disc3,
  MapPin,
  Trees,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react-native";
import { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";

import { googlePhotoUrl } from "@/lib/googlePhoto";
import type { PlaceCategory } from "@/theme/domain";
import { colors } from "@/theme/tokens";

// Sem foto (ou sem chave, ou cota estourada), o quadrado vira o ícone da categoria numa cor
// da paleta — o layout não muda, só o conteúdo.
const ICONES: Record<PlaceCategory, { Icon: LucideIcon; cor: string }> = {
  bar: { Icon: Beer, cor: colors.orange },
  restaurante: { Icon: UtensilsCrossed, cor: colors.coral },
  balada: { Icon: Disc3, cor: colors.lilac },
  cafe: { Icon: Coffee, cor: colors.yellow },
  hotel: { Icon: BedDouble, cor: colors.turquoise },
  servico: { Icon: Wrench, cor: colors.subtle },
  praca: { Icon: Trees, cor: colors.turquoise },
  outro: { Icon: MapPin, cor: colors.subtle },
};

type Props = {
  category: PlaceCategory;
  photoName?: string | null;
  photoAuthor?: string | null;
  photoAuthorUri?: string | null;
  /** "tile" é o quadrado do card; "banner" é a faixa larga da ficha, com o crédito por cima. */
  variant?: "tile" | "banner";
  size?: number;
};

export function PlacePhoto({
  category,
  photoName,
  photoAuthor,
  photoAuthorUri,
  variant = "tile",
  size = 64,
}: Props) {
  const [falhou, setFalhou] = useState(false);
  const largura = variant === "banner" ? 800 : 200;
  const url = falhou ? null : googlePhotoUrl(photoName, largura);
  const { Icon, cor } = ICONES[category] ?? ICONES.outro;

  const fallback = (
    <View
      className="items-center justify-center"
      style={{ backgroundColor: cor, width: "100%", height: "100%" }}
    >
      <Icon color={colors.night} size={variant === "banner" ? 40 : size * 0.45} />
    </View>
  );

  const credito = url && (
    <Pressable
      onPress={() => photoAuthorUri && Linking.openURL(photoAuthorUri)}
      className="absolute bottom-0 left-0 right-0 px-2 py-1"
      style={{ backgroundColor: "rgba(30,35,64,0.55)" }}
    >
      <Text className="font-body text-[10px] text-paper" numberOfLines={1}>
        {photoAuthor ? `Foto: ${photoAuthor} · Google` : "Foto: Google"}
      </Text>
    </Pressable>
  );

  if (variant === "banner") {
    return (
      <View className="overflow-hidden rounded-xl" style={{ height: 160 }}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
            onError={() => setFalhou(true)}
            accessibilityLabel="Foto do lugar"
          />
        ) : (
          fallback
        )}
        {credito}
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-lg" style={{ width: size, height: size }}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onError={() => setFalhou(true)}
          accessibilityLabel="Foto do lugar"
        />
      ) : (
        fallback
      )}
    </View>
  );
}
