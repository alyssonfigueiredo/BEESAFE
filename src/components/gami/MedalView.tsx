import { useMemo } from "react";
import { SvgXml } from "react-native-svg";

import { getMedalha, medalXml, type Banho } from "@/lib/medals";

type Props = {
  id: string;
  size?: number;
  on?: boolean;
  prog?: number;
  banho?: Banho | null;
  lockIcon?: boolean;
};

/** Medalha limpa: disco, objeto e anel. Bloqueada é silhueta com o anel mostrando quanto falta. */
export function MedalView({
  id,
  size = 96,
  on = true,
  prog = 0,
  banho = null,
  lockIcon = true,
}: Props) {
  const m = getMedalha(id);
  const xml = useMemo(
    () =>
      m ? medalXml(m.art, { state: on ? "on" : "lock", prog, cat: m.cat, banho, lockIcon }) : "",
    [m, on, prog, banho, lockIcon],
  );
  if (!xml) return null;
  return <SvgXml xml={xml} width={size} height={size} />;
}
