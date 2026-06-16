import { STAT_KEYS, STAT_META, type Item, type StatBlock, type StatKey } from "@/lib/schema";
import { formatStat } from "@/lib/format";

export type StatGroup = "offense" | "defense" | "utility";

export interface StatRow {
  key: StatKey;
  label: string;
  group: StatGroup;
  /** Display string (attack speed is the final attacks/sec, not the bonus ratio). */
  display: string;
  /** Raw numeric (for bars / sorting). */
  value: number;
}

/**
 * Turn computed totals into ordered, display-ready rows. Shared by every
 * design's stat panel so the *data* is identical and only the *presentation*
 * differs. Attack speed is special-cased to show final attacks/second.
 */
export function statRows(stats: StatBlock, attackSpeed: number): StatRow[] {
  const rows: StatRow[] = [];
  for (const key of STAT_KEYS) {
    if (key === "attackSpeed") {
      if (attackSpeed > 0) {
        rows.push({
          key,
          label: STAT_META[key].label,
          group: STAT_META[key].group,
          display: attackSpeed.toFixed(2),
          value: attackSpeed,
        });
      }
      continue;
    }
    const v = stats[key];
    if (!v) continue;
    rows.push({
      key,
      label: STAT_META[key].label,
      group: STAT_META[key].group,
      display: formatStat(key, v),
      value: v,
    });
  }
  return rows;
}

export interface ItemStatLine {
  key: StatKey;
  label: string;
  display: string;
  value: number;
}

/** Ordered stat lines for an item card/tooltip. */
export function itemStatLines(item: Item): ItemStatLine[] {
  return STAT_KEYS.filter((k) => item.stats[k]).map((k) => ({
    key: k,
    label: STAT_META[k].label,
    display: formatStat(k, item.stats[k]!),
    value: item.stats[k]!,
  }));
}

export const GROUP_LABEL: Record<StatGroup, string> = {
  offense: "Offense",
  defense: "Defense",
  utility: "Utility",
};
