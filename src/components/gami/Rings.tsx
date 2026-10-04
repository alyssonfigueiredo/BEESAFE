import Svg, { Circle, Path } from "react-native-svg";

import { mark } from "@/theme/tokens";

// Anéis da gamificação, na geometria do símbolo da marca (caixa 100 × 100, pupila no centro).

function arc(ro: number, ri: number, a0: number, a1: number) {
  const p = (r: number, a: number) =>
    `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(ro, a0)}A${ro} ${ro} 0 0 1 ${p(ro, a1)}L${p(ri, a1)}A${ri} ${ri} 0 0 0 ${p(ri, a0)}Z`;
}
const rad = (g: number) => (g * Math.PI) / 180;

function lerp(a: string, b: string, t: number) {
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const x = parseInt(a.slice(i, i + 2), 16),
      y = parseInt(b.slice(i, i + 2), 16);
    out += Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}
/** Cor do anel da marca na posição t (0 a 1). */
export function ringColor(t: number) {
  const r = mark.ring,
    p = Math.min(0.9999, Math.max(0, t)) * r.length,
    i = Math.floor(p);
  return lerp(r[i], r[(i + 1) % r.length], p - i);
}

const OFF = "#E4E1DA";
function Pupil() {
  return (
    <>
      <Circle cx={50} cy={50} r={13} fill={mark.pupil} />
      <Circle cx={46.1} cy={45.6} r={2.86} fill="#FFFFFF" />
    </>
  );
}

/** Semana: quatro pedaços que só acendem. Nenhum dia da semana à vista. */
export function WeekRing({ dias, size = 40 }: { dias: number; size?: number }) {
  const cores = [mark.ring[0], mark.ring[2], mark.ring[3], mark.ring[5]];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {cores.map((c, i) => (
        <Path
          key={i}
          d={arc(48, 32, rad(-90 + 90 * i + 5), rad(-90 + 90 * (i + 1) - 5))}
          fill={i < dias ? c : OFF}
        />
      ))}
      <Pupil />
    </Svg>
  );
}

/** Anel de N tracinhos com os primeiros `lit` acesos (48 = anel da pessoa, 100 = cidade). */
export function SliceRing({
  lit,
  n = 48,
  size = 40,
  inner = 35,
  gap = 0.6,
}: {
  lit: number;
  n?: number;
  size?: number;
  inner?: number;
  gap?: number;
}) {
  const step = 360 / n;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {Array.from({ length: n }, (_, i) => (
        <Path
          key={i}
          d={arc(48, inner, rad(-90 + step * i + gap / 2), rad(-90 + step * (i + 1) - gap / 2))}
          fill={i < lit ? ringColor(n === 48 ? i / 48 : lit > 1 ? i / (lit - 1) : 0) : OFF}
        />
      ))}
      <Pupil />
    </Svg>
  );
}
