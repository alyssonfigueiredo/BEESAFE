import { useId } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { colors, mark } from "@/theme/tokens";

// Símbolo da Irisa: anel de cor, varredura de radar, blips e pupila com reflexo.
// Mesma geometria de scripts/gen-icons.mjs, numa caixa de 100 × 100.

const RING_SLICES = 48;
const SWEEP_START = (-150 * Math.PI) / 180;
const SWEEP_END = (-55 * Math.PI) / 180;

function point(r: number, a: number) {
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

function slicePath(ro: number, ri: number, a0: number, a1: number) {
  const o0 = point(ro, a0),
    o1 = point(ro, a1),
    i1 = point(ri, a1),
    i0 = point(ri, a0);
  return (
    `M ${o0.x} ${o0.y} A ${ro} ${ro} 0 0 1 ${o1.x} ${o1.y} ` +
    `L ${i1.x} ${i1.y} A ${ri} ${ri} 0 0 0 ${i0.x} ${i0.y} Z`
  );
}

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

function ringColor(t: number) {
  const p = t * mark.ring.length;
  const i = Math.floor(p) % mark.ring.length;
  return lerp(mark.ring[i], mark.ring[(i + 1) % mark.ring.length], p - Math.floor(p));
}

const ringSlices = Array.from({ length: RING_SLICES }, (_, i) => ({
  d: slicePath(
    48,
    35,
    (i / RING_SLICES) * 2 * Math.PI - Math.PI / 2,
    ((i + 1) / RING_SLICES) * 2 * Math.PI - Math.PI / 2 + 0.05,
  ),
  fill: ringColor(i / RING_SLICES),
}));

const sweepStart = point(33, SWEEP_START);
const sweepEnd = point(33, SWEEP_END);

export function Mark({ size = 28 }: { size?: number }) {
  // ids de gradiente são globais no react-native-svg: cada instância precisa do seu
  const sweepId = `sweep-${useId()}`;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient
          id={sweepId}
          gradientUnits="userSpaceOnUse"
          x1={sweepStart.x}
          y1={sweepStart.y}
          x2={sweepEnd.x}
          y2={sweepEnd.y}
        >
          <Stop offset="0" stopColor={mark.sweep} stopOpacity={0} />
          <Stop offset="1" stopColor={mark.sweep} stopOpacity={0.5} />
        </LinearGradient>
      </Defs>

      {ringSlices.map((s) => (
        <Path key={s.d} d={s.d} fill={s.fill} />
      ))}

      <Path d={slicePath(33, 0, SWEEP_START, SWEEP_END)} fill={`url(#${sweepId})`} />
      <Path
        d={`M 50 50 L ${sweepEnd.x} ${sweepEnd.y}`}
        stroke={mark.sweep}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeOpacity={0.75}
      />
      <Circle
        cx={50}
        cy={50}
        r={25}
        fill="none"
        stroke={mark.sweep}
        strokeWidth={0.8}
        strokeOpacity={0.35}
      />

      <Circle cx={66} cy={36} r={3.1} fill={mark.sweep} />
      <Circle cx={63} cy={62} r={2.4} fill={colors.coral} />
      <Circle cx={38} cy={34} r={1.9} fill={mark.sweep} />

      <Circle cx={50} cy={50} r={13} fill={mark.pupil} />
      <Circle cx={46.1} cy={45.6} r={2.86} fill="#FFFFFF" />
    </Svg>
  );
}
