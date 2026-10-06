import { Image, View } from "react-native";

import { bustoSrc, BUSTO_ASPECTO } from "@/lib/irisePersonagens";

/**
 * Avatar circular do irise: a imagem de busto é mais larga que o círculo de propósito (112%),
 * alinhada pelo topo — mesma regra do design de referência (IriseAvatar). Nunca usa o corpo
 * inteiro aqui, corta torto.
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
  const w = size * 1.12;
  const h = w * BUSTO_ASPECTO;
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden" }}
    >
      <Image
        source={bustoSrc(pose, personagem)}
        style={{ position: "absolute", top: 0, left: (size - w) / 2, width: w, height: h }}
        resizeMode="cover"
      />
    </View>
  );
}
