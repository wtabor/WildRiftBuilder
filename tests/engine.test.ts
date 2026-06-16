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
    const eff = goldEfficiency(infinityEdge);
    expect(eff).not.toBeNull();
    // 65 AD * 35 + 0.25 crit * 40(per100%)=... wholly stat-based ratio > 0
    expect(eff!).toBeGreaterThan(0);
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
});
