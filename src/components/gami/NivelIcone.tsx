import { useMemo } from "react";
import { SvgXml } from "react-native-svg";

import { iconeXml } from "@/lib/niveis";

/** Ícone do nível de "Sua evolução" (0 a 7). */
export function NivelIcone({ k, size = 36 }: { k: number; size?: number }) {
  const xml = useMemo(() => iconeXml(k), [k]);
  return <SvgXml xml={xml} width={size} height={size} />;
}
