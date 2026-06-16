import { z } from "zod";

/**
 * The canonical set of character statistics used throughout the app.
 *
 * Every champion base/growth value, every item stat line, and every computed
 * total is expressed as a (partial) record over these keys. Keeping a single
 * vocabulary here is what lets the stat engine sum heterogeneous sources
 * (champion + items + — later — runes/passives) without special-casing.
 */
export const STAT_KEYS = [
  "attackDamage",
  "abilityPower",
  "attackSpeed", // bonus attack speed, expressed as a ratio (0.25 = +25%)
  "critChance", // 0..1
  "critDamage", // bonus over the 1.75x base crit multiplier, as a ratio
  "armor",
  "magicResist",
  "maxHealth",
  "healthRegen", // per 5s
  "mana",
  "manaRegen", // per 5s
  "moveSpeedFlat",
  "moveSpeedPercent", // 0.05 = +5%
  "abilityHaste",
  "lethality", // flat armor penetration (pre-conversion)
  "armorPenPercent", // 0..1
  "magicPenFlat",
  "magicPenPercent", // 0..1
  "lifeSteal", // 0..1
  "omnivamp", // 0..1
  "healAndShieldPower", // 0..1
  "tenacity", // 0..1
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

/** A bag of stat contributions. Absent keys are treated as 0. */
export type StatBlock = Partial<Record<StatKey, number>>;

export const StatBlockSchema = z
  .object(
    Object.fromEntries(STAT_KEYS.map((k) => [k, z.number()])) as Record<
      StatKey,
      z.ZodNumber
    >,
  )
  .partial();

/** Human-readable labels + formatting hints for the UI. */
export const STAT_META: Record<
  StatKey,
  { label: string; group: "offense" | "defense" | "utility"; format: "flat" | "percent" }
> = {
  attackDamage: { label: "Attack Damage", group: "offense", format: "flat" },
  abilityPower: { label: "Ability Power", group: "offense", format: "flat" },
  attackSpeed: { label: "Attack Speed", group: "offense", format: "percent" },
  critChance: { label: "Crit Chance", group: "offense", format: "percent" },
  critDamage: { label: "Crit Damage", group: "offense", format: "percent" },
  lethality: { label: "Lethality", group: "offense", format: "flat" },
  armorPenPercent: { label: "Armor Pen", group: "offense", format: "percent" },
  magicPenFlat: { label: "Magic Pen", group: "offense", format: "flat" },
  magicPenPercent: { label: "Magic Pen", group: "offense", format: "percent" },
  abilityHaste: { label: "Ability Haste", group: "offense", format: "flat" },
  lifeSteal: { label: "Life Steal", group: "offense", format: "percent" },
  omnivamp: { label: "Omnivamp", group: "offense", format: "percent" },
  armor: { label: "Armor", group: "defense", format: "flat" },
  magicResist: { label: "Magic Resist", group: "defense", format: "flat" },
  maxHealth: { label: "Health", group: "defense", format: "flat" },
  healthRegen: { label: "Health Regen", group: "defense", format: "flat" },
  tenacity: { label: "Tenacity", group: "defense", format: "percent" },
  mana: { label: "Mana", group: "utility", format: "flat" },
  manaRegen: { label: "Mana Regen", group: "utility", format: "flat" },
  moveSpeedFlat: { label: "Move Speed", group: "utility", format: "flat" },
  moveSpeedPercent: { label: "Move Speed %", group: "utility", format: "percent" },
  healAndShieldPower: { label: "Heal & Shield Power", group: "utility", format: "percent" },
};
