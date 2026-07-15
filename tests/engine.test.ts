import { describe, it, expect } from "vitest";
import {
  growthAt,
  sumStats,
  championBaseAtLevel,
  computeBuild,
  goldEfficiency,
  MAX_LEVEL,
} from "../src/lib/stats/engine";
import { ChampionSchema, ItemSchema } from "../src/lib/schema/index";
import { getItem } from "../src/lib/data";

const ashe = ChampionSchema.parse({
  id: "ashe",
  name: "Ashe",
  stats: {
    attackDamage: { base: 59, perLevel: 3 },
    attackSpeed: { base: 0.658, perLevel: 0.0333 },
    armor: { base: 26, perLevel: 3.4 },
    magicResist: { base: 30, perLevel: 1.3 },
    maxHealth: { base: 610, perLevel: 100 },
    healthRegen: { base: 3.5, perLevel: 0.55 },
    mana: { base: 280, perLevel: 32 },
    manaRegen: { base: 6.97, perLevel: 0.4 },
    moveSpeed: 325,
  },
});

const infinityEdge = ItemSchema.parse({
  id: "infinity-edge",
  name: "Infinity Edge",
  cost: 3400,
  stats: { attackDamage: 65, critChance: 0.25 },
});

const phantomDancer = ItemSchema.parse({
  id: "phantom-dancer",
  name: "Phantom Dancer",
  cost: 2800,
  stats: { attackSpeed: 0.3, critChance: 0.2 },
});

describe("growthAt", () => {
  it("returns base at level 1", () => {
    expect(growthAt(59, 3, 1)).toBe(59);
  });
  it("applies linear growth", () => {
    expect(growthAt(59, 3, 5)).toBe(59 + 3 * 4);
  });
  it("clamps to the level cap", () => {
    expect(growthAt(59, 3, 99)).toBe(growthAt(59, 3, MAX_LEVEL));
  });
});

describe("sumStats", () => {
  it("adds matching keys and treats absent as zero", () => {
    expect(sumStats({ attackDamage: 10 }, { attackDamage: 5, armor: 3 })).toEqual({
      attackDamage: 15,
      armor: 3,
    });
  });
});

describe("championBaseAtLevel", () => {
  it("scales AD with level", () => {
    const lvl1 = championBaseAtLevel(ashe, 1);
    const lvl15 = championBaseAtLevel(ashe, 15);
    expect(lvl1.attackDamage).toBe(59);
    expect(lvl15.attackDamage).toBe(59 + 3 * 14);
  });
});

describe("computeBuild", () => {
  it("sums champion base and item stats", () => {
    const totals = computeBuild(ashe, 1, [infinityEdge]);
    expect(totals.stats.attackDamage).toBe(59 + 65);
    expect(totals.stats.critChance).toBe(0.25);
    expect(totals.goldCost).toBe(3400);
  });

  it("combines base AS with bonus attack speed from items and levels", () => {
    const totals = computeBuild(ashe, 1, [phantomDancer]);
    // base 0.658 * (1 + 0.30 bonus from PD) = 0.8554
    expect(totals.attackSpeed).toBeCloseTo(0.658 * 1.3, 4);
  });

  it("caps attack speed at 2.5", () => {
    const monster = ItemSchema.parse({
      id: "x",
      name: "x",
      cost: 0,
      stats: { attackSpeed: 5 },
    });
    const totals = computeBuild(ashe, 15, [monster]);
    expect(totals.attackSpeed).toBeLessThanOrEqual(2.5);
  });
});

describe("goldEfficiency", () => {
  it("computes efficiency from raw stat gold values", () => {
    // 65 AD * 41.67 + 0.25 crit * 5000 = 3958.55 over 3400 gold.
    expect(goldEfficiency(infinityEdge)).toBeCloseTo(3958.55 / 3400, 4);
  });
  it("prices the reference components at ~100% by construction", () => {
    // GOLD_VALUES is derived from WR component prices, so the components
    // themselves must come out at 1.0 — this pins the percent-stat scaling
    // (attack speed is stored as a ratio: 0.15 = +15%).
    const dagger = ItemSchema.parse({ id: "d", name: "d", cost: 500, stats: { attackSpeed: 0.15 } });
    expect(goldEfficiency(dagger)).toBeCloseTo(1, 2);
    const ruby = ItemSchema.parse({ id: "r", name: "r", cost: 500, stats: { maxHealth: 150 } });
    expect(goldEfficiency(ruby)).toBeCloseTo(1, 2);
    const brawlers = ItemSchema.parse({ id: "b", name: "b", cost: 500, stats: { critChance: 0.1 } });
    expect(goldEfficiency(brawlers)).toBeCloseTo(1, 2);
  });
  it("returns null for items with no priced stats", () => {
    const item = ItemSchema.parse({
      id: "y",
      name: "y",
      cost: 1000,
      stats: { tenacity: 0.2 },
    });
    expect(goldEfficiency(item)).toBeNull();
  });
  it("prices the current patch's Void Amethyst at ~100% (magicPenPercent anchor)", () => {
    // magicPenPercent is derived from this exact dataset item (1000g / 20 AP /
    // 10% pen), so drift between GOLD_VALUES and the live data fails here.
    const voidAmethyst = getItem("void-amethyst");
    expect(voidAmethyst).toBeDefined();
    expect(goldEfficiency(voidAmethyst!)).toBeCloseTo(1, 2);
  });
});
