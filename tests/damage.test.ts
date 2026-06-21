import { describe, it, expect } from "vitest";
import {
  resistMultiplier,
  effectiveResist,
  autoAttackDps,
  PERCENT_PEN_CAP,
  type AutoAttackInput,
} from "../src/lib/damage/engine";
import { getItem } from "../src/lib/data";
import type { Item } from "../src/lib/schema";

const TARGET = { armor: 100, magicResist: 50, maxHealth: 2000 };

function item(id: string): Item {
  const it = getItem(id);
  if (!it) throw new Error(`missing test item ${id}`);
  return it;
}

describe("resistMultiplier", () => {
  it("halves damage at 100 resist", () => {
    expect(resistMultiplier(100)).toBeCloseTo(0.5);
  });
  it("is 1.0 at zero resist", () => {
    expect(resistMultiplier(0)).toBe(1);
  });
  it("amplifies damage for negative resist", () => {
    expect(resistMultiplier(-100)).toBeCloseTo(1.5);
  });
});

describe("effectiveResist", () => {
  it("applies shred, then %pen, then flat pen", () => {
    // 100 armor, 50% shred → 50, then 20% pen → 40, then 10 lethality → 30.
    expect(effectiveResist(100, { shredPercent: 0.5, pctPen: 0.2, flatPen: 10 })).toBeCloseTo(30);
  });
  it("caps percent penetration", () => {
    // Asking for 90% pen is clamped to the 40% cap: 100 → 60.
    expect(effectiveResist(100, { pctPen: 0.9 })).toBeCloseTo(100 * (1 - PERCENT_PEN_CAP));
  });
  it("never goes below zero", () => {
    expect(effectiveResist(20, { flatPen: 100 })).toBe(0);
  });
});

describe("autoAttackDps", () => {
  const baseInput = (extra: Partial<AutoAttackInput> = {}): AutoAttackInput => ({
    stats: { attackDamage: 100, critChance: 0, critDamage: 0.75 },
    attackSpeed: 1,
    level: 15,
    items: [],
    ...extra,
  });

  it("computes plain AD damage mitigated by armor", () => {
    // 100 AD, 1.0 AS, no crit, vs 100 armor (0.5 mult) → 50 per hit, 50 dps.
    const r = autoAttackDps(baseInput(), TARGET);
    expect(r.perHit).toBeCloseTo(50);
    expect(r.dps).toBeCloseTo(50);
  });

  it("averages crit over many hits", () => {
    // 100 AD, 50% crit, +75% crit dmg: avg = 100*(1 + 0.5*0.75) = 137.5, *0.5 armor = 68.75.
    const r = autoAttackDps(baseInput({ stats: { attackDamage: 100, critChance: 0.5, critDamage: 0.75 } }), TARGET);
    expect(r.perHit).toBeCloseTo(68.75);
  });

  it("adds Terminus on-hit magic damage as a separate type", () => {
    const withTerminus = autoAttackDps(baseInput({ items: [item("terminus")] }), TARGET);
    const plain = autoAttackDps(baseInput(), TARGET);
    // Terminus Shadow = 35 magic on-hit. Its Juxtaposition also grants 33%
    // magic pen, so effective MR = 50 × (1 − 0.33) = 33.5 before mitigation.
    expect(withTerminus.breakdown.magic).toBeCloseTo(35 * resistMultiplier(50 * (1 - 0.33)), 1);
    expect(withTerminus.dps).toBeGreaterThan(plain.dps);
  });

  it("amortizes Kraken's every-third-hit proc", () => {
    const r = autoAttackDps(baseInput({ items: [item("kraken-slayer")] }), TARGET);
    const plain = autoAttackDps(baseInput(), TARGET);
    // Kraken adds physical on-hit (160 at L15 / 3 hits), so physical/hit rises.
    expect(r.breakdown.physical).toBeGreaterThan(plain.breakdown.physical);
  });

  it("Infinity Edge raises the crit multiplier", () => {
    const withIE = autoAttackDps(
      baseInput({ stats: { attackDamage: 100, critChance: 1, critDamage: 0.75 }, items: [item("infinity-edge")] }),
      TARGET,
    );
    const without = autoAttackDps(
      baseInput({ stats: { attackDamage: 100, critChance: 1, critDamage: 0.75 } }),
      TARGET,
    );
    // IE's +0.30 crit damage makes guaranteed crits hit harder.
    expect(withIE.breakdown.physical).toBeGreaterThan(without.breakdown.physical);
  });

  it("applies always-on item penetration carried in stats", () => {
    // Serylda's Grudge: +33% armor pen now lives in item stats.
    const withSerylda = autoAttackDps(
      baseInput({ stats: { attackDamage: 100, critChance: 0, critDamage: 0.75, armorPenPercent: 0.33 } }),
      TARGET,
    );
    // 100 armor × (1 − 0.33) = 67 effective armor.
    expect(withSerylda.effective.armor).toBeCloseTo(67);
  });

  it("caps stacked percent armor pen at 40%", () => {
    // Serylda's 33% + Terminus' Dark 33% would be 66%, but item %pen caps at 40%.
    const r = autoAttackDps(
      baseInput({ stats: { attackDamage: 100, armorPenPercent: 0.33 }, items: [item("terminus")] }),
      TARGET,
    );
    expect(r.effective.armor).toBeCloseTo(100 * (1 - PERCENT_PEN_CAP));
  });
});
