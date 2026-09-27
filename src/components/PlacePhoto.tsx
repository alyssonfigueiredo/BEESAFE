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
import { useEffect, useState } from "react";
import { Image, type ImageStyle, Linking, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { googlePhotoUrl } from "@/lib/googlePhoto";
import { onLight, type PlaceCategory } from "@/theme/domain";
import { colors } from "@/theme/tokens";

// Sem foto (ou sem chave, ou cota estourada), o quadrado vira o ícone da categoria numa cor
// da paleta — o layout não muda, só o conteúdo.
// Azulejo tonal: fundo na cor a 18 %, ícone na versão escura. Lugar sem nota fica cinza
// (`muted`): é o conceito do app, cinza vira cor quando a comunidade responde.
const ICONES: Record<PlaceCategory, { Icon: LucideIcon; cor: string }> = {
  bar: { Icon: Beer, cor: colors.coral },
  restaurante: { Icon: UtensilsCrossed, cor: colors.orange },
  balada: { Icon: Disc3, cor: colors.lilac },
  cafe: { Icon: Coffee, cor: colors.yellow },
  hotel: { Icon: BedDouble, cor: colors.turquoise },
  servico: { Icon: Wrench, cor: colors.dim },
  praca: { Icon: Trees, cor: colors.turquoise },
  outro: { Icon: MapPin, cor: colors.dim },
};

type Props = {
  category: PlaceCategory;
  photoName?: string | null;
  photoAuthor?: string | null;
  photoAuthorUri?: string | null;
  /** "tile" é o quadrado do card; "banner" é a faixa larga da ficha, com o crédito por cima. */
  variant?: "tile" | "banner";
  size?: number;
  /** Sem avaliação: o azulejo fica cinza até alguém dizer quanta cor tem. */
  muted?: boolean;
  /** 0 a 1: quanto da cor já voltou (uma pergunta respondida = um quarto). Só vale com `muted`. */
  progress?: number;
};

export function PlacePhoto({
  category,
  photoName,
  photoAuthor,
  photoAuthorUri,
  variant = "tile",
  size = 64,
  muted = false,
  progress = 0,
}: Props) {
  const [falhou, setFalhou] = useState(false);
  const largura = variant === "banner" ? 800 : 200;
  const url = falhou ? null : googlePhotoUrl(photoName, largura);
  const { Icon, cor } = ICONES[category] ?? ICONES.outro;
  // Cinza vira cor: quanto da cor já voltou (1 = colorido). Anima a cada resposta.
  const alvo = muted ? progress : 1;
  const p = useSharedValue(alvo);
  useEffect(() => {
    p.value = withTiming(alvo, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [alvo, p]);
  const tileStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [colors.dim + "26", cor + "2E"]),
  }));
  const veilStyle = useAnimatedStyle(() => ({ opacity: 0.75 * (1 - p.value) }));
  const iconColor = alvo >= 0.5 ? onLight(cor) : colors.dim;

  const fallback = (
    <Animated.View
      className="items-center justify-center"
      style={[{ width: "100%", height: "100%" }, tileStyle]}
    >
      <Icon color={iconColor} size={variant === "banner" ? 40 : size * 0.45} />
    </Animated.View>
  );
  // Foto real sem cor: cinza enquanto ninguém respondeu; depois um véu que some a cada resposta.
  const veu = muted && (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", inset: 0, backgroundColor: colors.subtle }, veilStyle]}
    />
  );
  const cinza: ImageStyle | undefined =
    muted && progress === 0 ? { filter: [{ grayscale: 1 }] } : undefined;

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
      <View className="overflow-hidden rounded-3xl" style={{ height: 160 }}>
        {url ? (
          <Image
            source={{ uri: url }}
            style={[{ width: "100%", height: "100%" }, cinza]}
            resizeMode="cover"
            onError={() => setFalhou(true)}
            accessibilityLabel="Foto do lugar"
          />
        ) : (
          fallback
        )}
        {url && veu}
        {credito}
      </View>
    );
  }

  return (
    <View className="overflow-hidden rounded-2xl" style={{ width: size, height: size }}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={[{ width: size, height: size }, cinza]}
          resizeMode="cover"
          onError={() => setFalhou(true)}
          accessibilityLabel="Foto do lugar"
        />
      ) : (
        fallback
      )}
      {url && veu}
    </View>
  );
}
