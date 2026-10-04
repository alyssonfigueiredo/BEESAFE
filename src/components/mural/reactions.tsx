import { SvgXml } from "react-native-svg";

import type { ReactionKind } from "@/hooks/useSupport";

// Reações próprias da Irisa: desenho e nome da casa, nada de emoji genérico. Os traços são os
// do protótipo v2 (viewBox 24), em texto para o SvgXml.

function irisRing() {
  const C = ["#FF6964", "#FFA353", "#FFD066", "#49DCC0", "#59A7FF", "#A889FF"];
  const P = (r: number, a: number) =>
    `${(12 + r * Math.cos(a)).toFixed(2)} ${(12 + r * Math.sin(a)).toFixed(2)}`;
  let h = "";
  for (let i = 0; i < 6; i++) {
    const a0 = ((-90 + 60 * i + 4) * Math.PI) / 180;
    const a1 = ((-90 + 60 * (i + 1) - 4) * Math.PI) / 180;
    h += `<path d="M${P(10, a0)}A10 10 0 0 1 ${P(10, a1)}L${P(6.6, a1)}A6.6 6.6 0 0 0 ${P(6.6, a0)}Z" fill="${C[i]}"/>`;
  }
  return (
    h +
    '<circle cx="12" cy="12" r="3.2" fill="#141829"/><circle cx="11" cy="10.9" r=".9" fill="#fff"/>'
  );
}

export const REACTIONS: Record<ReactionKind, { label: string; svg: string }> = {
  abraco: {
    label: "Te abraço",
    svg: '<path d="M12 20.5 4.6 13.4a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9a4.6 4.6 0 0 1 6.5 6.5Z" fill="#FF6964"/>',
  },
  arrasou: {
    label: "Arrasou",
    svg: '<path d="M12 20 3 9a12 12 0 0 1 18 0Z" fill="#FFD066"/><path d="M12 20 6.2 5.6M12 20l-2-15.6M12 20l2-15.6M12 20l5.8-14.4" stroke="#B98500" stroke-width="1.2"/><circle cx="12" cy="20" r="1.8" fill="#B98500"/>',
  },
  contigo: {
    label: "Tô contigo",
    svg: '<circle cx="8.5" cy="7.5" r="3" fill="#A889FF"/><circle cx="15.5" cy="7.5" r="3" fill="#49DCC0"/><path d="M2.5 20a6 6 0 0 1 12 0Z" fill="#A889FF"/><path d="M9.5 20a6 6 0 0 1 12 0Z" fill="#49DCC0"/>',
  },
  sinto: {
    label: "Sinto muito",
    svg: '<path d="M7 15a4.5 4.5 0 1 1 1.2-8.8A5.5 5.5 0 0 1 18.6 8 3.6 3.6 0 0 1 18 15Z" fill="#B7C0D8"/><path d="M8.5 18v2M12 18v3M15.5 18v2" stroke="#59A7FF" stroke-width="2" stroke-linecap="round"/>',
  },
  acendeu: {
    label: "Acendeu",
    svg: '<path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8V17h7.6v-2.7A6.5 6.5 0 0 0 12 2.5Z" fill="#FFD066"/><rect x="8.6" y="18.2" width="6.8" height="2.6" rx="1.2" fill="#B98500"/>',
  },
  cor: { label: "Mais cor", svg: irisRing() },
};

const XML = Object.fromEntries(
  Object.entries(REACTIONS).map(([k, r]) => [
    k,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${r.svg}</svg>`,
  ]),
) as Record<ReactionKind, string>;

export function ReactionIcon({ kind, size = 16 }: { kind: ReactionKind; size?: number }) {
  const xml = XML[kind];
  if (!xml) return null;
  return <SvgXml xml={xml} width={size} height={size} />;
}
