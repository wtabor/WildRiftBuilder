import type { Item, StatKey } from "@/lib/schema";

/** Up to two-letter initials for a champion/item monogram tile. */
export function initials(name: string): string {
  const words = name.replace(/['’]/g, "").split(/[\s-]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Deterministic hue (0–360) derived from a string — stable monogram colors. */
export function hashHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 360;
  return h;
}

/**
 * A coarse "class" for an item, derived from its dominant tag. Used to color
 * item tiles consistently across designs (AD = orange, AP = blue, etc.).
 */
export type ItemClass = "ad" | "ap" | "attackspeed" | "crit" | "health" | "armor" | "magic" | "boots" | "utility";

export function itemClass(item: Item): ItemClass {
  const tags = item.tags.map((t) => t.toLowerCase());
  if (item.slot === "boots" || tags.includes("boots")) return "boots";
  if (tags.includes("ap")) return "ap";
  if (tags.includes("crit")) return "crit";
  if (tags.includes("attackspeed") || tags.includes("as")) return "attackspeed";
  if (tags.includes("ad")) return "ad";
  if (tags.includes("armor")) return "armor";
  if (tags.includes("magicresist") || tags.includes("mr")) return "magic";
  if (tags.includes("health")) return "health";
  return "utility";
}

/** Hex colors per item class, tuned to read well on dark surfaces. */
export const ITEM_CLASS_COLOR: Record<ItemClass, string> = {
  ad: "#e0964e",
  ap: "#3a9bdc",
  attackspeed: "#f0c674",
  crit: "#e06c9f",
  health: "#5fb86a",
  armor: "#c9a76a",
  magic: "#7aa0d0",
  boots: "#9aa6c4",
  utility: "#9aa6c4",
};

/** Which stat keys belong to a build's "primary" identity, for summaries. */
export const PRIMARY_STATS: StatKey[] = [
  "attackDamage",
  "abilityPower",
  "maxHealth",
  "armor",
  "magicResist",
];
