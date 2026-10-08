import { Image, View } from "react-native";

import { bustoSrc, BUSTO_ASPECTO } from "@/lib/irisePersonagens";
import { colors } from "@/theme/tokens";

/**
 * Avatar circular do irise: fundo branco opaco (sem ele a imagem "flutua" sem moldura — era o bug
 * reportado como "imagem destorcida/pequena") + a imagem de busto escalada pela LARGURA (preenche
 * o círculo de ponta a ponta, sem sobra transparente nas laterais) e deslocada 22% a partir do topo
 * (mesma proporção do protótipo aprovado: mostra o rosto, não o meio do busto).
 */
export function Busto({
  personagem,
  pose = 1,
  size,
}: {
  personagem: number;
  pose?: number;
  size: number;
}) {
  const h = size * BUSTO_ASPECTO;
  const top = -(h - size) * 0.22;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: colors.solid,
      }}
    >
      <Image
        source={bustoSrc(pose, personagem)}
        style={{ position: "absolute", top, left: 0, width: size, height: h }}
        resizeMode="cover"
      />
    </View>
  );
}
