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
 *
 * Values are gold per one point of the stat *as stored in the schema* — and
 * percent-type stats are stored as ratios (0.15 = 15%), so their entries are
 * the per-1% price × 100.
 *
 * Derived from Wild Rift component item prices (never PC League values),
 * verified 2026-07-14 against two sources:
 *   https://wiki.leagueoflegends.com/en-us/WR:Gold_efficiency
 *   https://liquipedia.net/wildrift/Portal:Items (per-item pages)
 * e.g. Long Sword 500g / 12 AD, Amplifying Tome 500g / 25 AP, Dagger
 * 500g / 15% AS, Ruby Crystal 500g / 150 HP, Brawler's Gloves 500g / 10% crit.
 * Stats with no clean component reference (crit damage, regen, tenacity,
 * heal & shield power, omnivamp, %armor pen) are left unpriced on purpose.
 *
 * %armor pen and omnivamp were researched 2026-07-14 and deliberately left
 * unpriced — do not fill these without a better reference:
 * - armorPenPercent: the reference component (Last Whisper) has three
 *   irreconcilable versions across sources — 800g / 12% pen / no AD (LoL wiki
 *   WR page, updated 7.1), 1100g / 15 AD / 10% (Liquipedia), 1300g / 15 AD /
 *   20% (lolwildriftbuild) — implying anywhere from 3375 to 6667 gold per 1.0
 *   ratio. Even the wiki's own gold-efficiency table shows a broken expression
 *   for this stat. riftgg's shop view isn't scrapable per-item.
 * - omnivamp: no WR component grants it (only Goredrinker / Immortal Treads,
 *   both passive-laden, so residual-value derivation would be dishonest).
 *   PC League's omnivamp price exists but PC values are never used here.
 */
export const GOLD_VALUES: Partial<Record<StatKey, number>> = {
  attackDamage: 41.67,
  abilityPower: 20,
  attackSpeed: 3333, // 33.33 per 1%
  critChance: 5000, // 50 per 1%
  armor: 25,
  magicResist: 25,
  maxHealth: 3.33,
  mana: 3.5,
  abilityHaste: 30,
  lethality: 20.83, // WR "armor penetration" (flat), via Serrated Dirk
  magicPenFlat: 26.67, // via Prophet's Pendant
  // Derived from this repo's own 7.2 Void Amethyst (1000g / 20 AP / 10% pen,
  // provenance-stamped from Riot patch notes): (1000 − 20×20) / 0.10 = 6000.
  // The wiki's pre-7.2 derivation (35 per 1%) is stale for the live economy.
  magicPenPercent: 6000,
  lifeSteal: 3667, // 36.67 per 1% (WR "physical vamp"), via Vampiric Scepter
  // Boots of Speed derivation: sources disagree (400g / 25 MS on the wiki vs
  // / 20 MS on Liquipedia) — using the wiki's 16/point until re-verified.
  moveSpeedFlat: 16,
  moveSpeedPercent: 5000, // 50 per 1%, via Aether Wisp
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
