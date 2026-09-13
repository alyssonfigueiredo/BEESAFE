import type { PublicOccurrence } from "./types";
import { colors } from "@/theme/tokens";

export type HeatCell = {
  key: string;
  lat: number;
  lng: number;
  count: number;
  color: string;
  radius: number;
};

/** Agrupa pontos em células de ~1 km (2 casas decimais), igual ao protótipo original. */
export function buildHeatCells(items: PublicOccurrence[]): HeatCell[] {
  const cells = new Map<string, { lat: number; lng: number; count: number }>();
  for (const o of items) {
    const key = `${o.latitude.toFixed(2)},${o.longitude.toFixed(2)}`;
    const cell = cells.get(key);
    if (cell) cell.count += 1;
    else
      cells.set(key, {
        lat: Number(o.latitude.toFixed(2)),
        lng: Number(o.longitude.toFixed(2)),
        count: 1,
      });
  }
  return [...cells.entries()].map(([key, c]) => ({
    key,
    ...c,
    color: c.count >= 5 ? colors.coral : c.count >= 3 ? colors.orange : colors.yellow,
    radius: Math.min(14 + c.count * 5, 46),
  }));
}
