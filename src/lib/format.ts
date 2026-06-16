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

/** "2026-06-10" → "Jun 10, 2026". Falls back to the raw string if unparseable. */
export function formatPatchDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
