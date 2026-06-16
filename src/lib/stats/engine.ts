import {
  STAT_KEYS,
  type StatBlock,
  type StatKey,
  type Champion,
  type Item,
} from "@/lib/schema";

export const MAX_LEVEL = 15; // Wild Rift level cap
export const BASE_ATTACK_SPEED_CAP = 2.5;

/**
 * Linear per-level growth: value(level) = base + perLevel * (level - 1).
 *
 * Isolated here so that if the verified Wild Rift growth formula turns out to be
 * non-linear, this is the only place that changes.
 */
export function growthAt(base: number, perLevel: number, level: number): number {
  const lvl = clamp(level, 1, MAX_LEVEL);
  return base + perLevel * (lvl - 1);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Sum any number of stat blocks into one. Absent keys count as 0. */
export function sumStats(...blocks: StatBlock[]): StatBlock {
  const out: StatBlock = {};
  for (const block of blocks) {
    for (const key of STAT_KEYS) {
      const v = block[key];
      if (v) out[key] = (out[key] ?? 0) + v;
    }
  }
  return out;
}

/** A champion's intrinsic stats at a given level (before items). */
export function championBaseAtLevel(champ: Champion, level: number): StatBlock {
  const s = champ.stats;
  const block: StatBlock = {
    attackDamage: growthAt(s.attackDamage.base, s.attackDamage.perLevel, level),
    armor: growthAt(s.armor.base, s.armor.perLevel, level),
    magicResist: growthAt(s.magicResist.base, s.magicResist.perLevel, level),
    maxHealth: growthAt(s.maxHealth.base, s.maxHealth.perLevel, level),
    healthRegen: growthAt(s.healthRegen.base, s.healthRegen.perLevel, level),
    mana: growthAt(s.mana.base, s.mana.perLevel, level),
    manaRegen: growthAt(s.manaRegen.base, s.manaRegen.perLevel, level),
    moveSpeedFlat: s.moveSpeed,
    critDamage: s.critDamageBase,
    // Champion base attack speed is the level-1 value; attackSpeed growth is a
    // *bonus ratio* that stacks with item attack speed in the totals.
    attackSpeed: growthAt(0, s.attackSpeed.perLevel, level),
  };
  if (s.abilityPower) {
    block.abilityPower = growthAt(s.abilityPower.base, s.abilityPower.perLevel, level);
  }
  return block;
}

export interface BuildTotals {
  /** Final, display-ready stat totals (champion + items). */
  stats: StatBlock;
  /** Final attack speed including base AS, capped at 2.5. */
  attackSpeed: number;
  /** Effective crit multiplier on an attack, e.g. 1.75. */
  critMultiplier: number;
  /** Total gold spent on the items provided. */
  goldCost: number;
}

/**
 * The core MVP computation: combine a champion at a level with a set of items
 * into final, display-ready totals. Pure and side-effect free.
 */
export function computeBuild(
  champ: Champion,
  level: number,
  items: Item[],
): BuildTotals {
  const base = championBaseAtLevel(champ, level);
  const itemStats = sumStats(...items.map((i) => i.stats));
  const stats = sumStats(base, itemStats);

  // Attack speed: champ base AS grows via a bonus ratio; items add bonus ratio.
  const baseAS = champ.stats.attackSpeed.base;
  const bonusASRatio = stats.attackSpeed ?? 0;
  const attackSpeed = clamp(baseAS * (1 + bonusASRatio), 0, BASE_ATTACK_SPEED_CAP);

  const critMultiplier = 1 + (stats.critDamage ?? 0.75);
  const goldCost = items.reduce((sum, i) => sum + i.cost, 0);

  return { stats, attackSpeed, critMultiplier, goldCost };
}

/**
 * Gold efficiency: value of an item's raw stats vs its cost, using standard
 * per-stat gold costs. >100% means stat-efficient before counting passives.
 */
export const GOLD_VALUES: Partial<Record<StatKey, number>> = {
  attackDamage: 35,
  abilityPower: 21.75,
  attackSpeed: 30, // per 1.0 ratio (i.e. per +100%); scaled below
  armor: 20,
  magicResist: 20,
  maxHealth: 13.33,
  mana: 4,
  critChance: 40, // per 1.0 (per +100%)
  abilityHaste: 26.67,
  lethality: 30,
  moveSpeedFlat: 12,
};

export function goldEfficiency(item: Item): number | null {
  let value = 0;
  let counted = false;
  for (const key of STAT_KEYS) {
    const amount = item.stats[key];
    const per = GOLD_VALUES[key];
    if (amount && per) {
      value += amount * per;
      counted = true;
    }
  }
  if (!counted || item.cost === 0) return null;
  return value / item.cost;
}
