import { STAT_META, type StatKey } from "@/lib/schema";

/** Format a stat value for display given its percent/flat nature. */
export function formatStat(key: StatKey, value: number): string {
  const meta = STAT_META[key];
  if (meta.format === "percent") {
    return `${Math.round(value * 1000) / 10}%`;
  }
  // Flat: round to a sensible precision.
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function formatGold(value: number): string {
  return value.toLocaleString("en-US");
}
