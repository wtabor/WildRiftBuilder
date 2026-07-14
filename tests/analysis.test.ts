import { describe, it, expect } from "vitest";
import {
  analyzeBuild,
  compareBuilds,
  damageIdentity,
  suggestSwap,
  type BuildInput,
} from "../src/lib/analysis/engine";
import { ChampionSchema, ItemSchema } from "../src/lib/schema/index";

const TARGET = { armor: 60, magicResist: 50, maxHealth: 2400 };

const baseStats = {
  attackDamage: { base: 60, perLevel: 3 },
  attackSpeed: { base: 0.7, perLevel: 0.03 },
  armor: { base: 30, perLevel: 3.5 },
  magicResist: { base: 32, perLevel: 1.3 },
  maxHealth: { base: 600, perLevel: 100 },
  healthRegen: { base: 4, perLevel: 0.5 },
  mana: { base: 300, perLevel: 30 },
  manaRegen: { base: 7, perLevel: 0.4 },
  moveSpeed: 330,
};

const marksman = ChampionSchema.parse({
  id: "marksman",
  name: "Marksman",
  stats: baseStats,
  abilities: [
    { slot: "Q", name: "Volley", damageType: "physical", baseDamage: [20], scalings: [{ stat: "attackDamage", ratio: 1.0 }] },
  ],
});

const mage = ChampionSchema.parse({
  id: "mage",
  name: "Mage",
  stats: baseStats,
  abilities: [
    { slot: "Q", name: "Blast", damageType: "magic", baseDamage: [80], scalings: [{ stat: "abilityPower", ratio: 0.7 }] },
    { slot: "W", name: "Nova", damageType: "magic", baseDamage: [60], scalings: [{ stat: "abilityPower", ratio: 0.6 }] },
  ],
});

const energyChamp = ChampionSchema.parse({
  id: "ninja",
  name: "Ninja",
  resourceType: "energy",
  stats: baseStats,
  abilities: [
    { slot: "Q", name: "Strike", damageType: "physical", baseDamage: [30], scalings: [{ stat: "bonusAttackDamage", ratio: 1.1 }] },
  ],
});

const critSword = ItemSchema.parse({
  id: "crit-sword",
  name: "Crit Sword",
  cost: 3000,
  stats: { attackDamage: 40, critChance: 0.6 },
});
const critBlade = ItemSchema.parse({
  id: "crit-blade",
  name: "Crit Blade",
  cost: 3000,
  stats: { attackDamage: 40, critChance: 0.6 },
});
const limitBreaker = ItemSchema.parse({
  id: "limit-breaker",
  name: "Limit Breaker",
  cost: 3400,
  stats: { attackDamage: 60, critChance: 0.6 },
  effects: [{ name: "Limit Break", kind: "passive", description: "Excess crit becomes crit damage.", mechanic: { kind: "crit", limitBreak: true } }],
});
const frenzyBlade = ItemSchema.parse({
  id: "frenzy-blade",
  name: "Frenzy Blade",
  cost: 2800,
  stats: { attackSpeed: 1.5 },
});
const manaTome = ItemSchema.parse({
  id: "mana-tome",
  name: "Mana Tome",
  cost: 1000,
  stats: { mana: 300, abilityPower: 30 },
});
const bigAxe = ItemSchema.parse({
  id: "big-axe",
  name: "Big Axe",
  cost: 3000,
  stats: { attackDamage: 55 },
});
const hugeAxe = ItemSchema.parse({
  id: "huge-axe",
  name: "Huge Axe",
  cost: 3200,
  stats: { attackDamage: 90 },
});
const overpricedRing = ItemSchema.parse({
  id: "overpriced-ring",
  name: "Overpriced Ring",
  cost: 3000,
  stats: { abilityPower: 40 },
});
const boots = ItemSchema.parse({
  id: "swift-boots",
  name: "Swift Boots",
  cost: 800,
  slot: "boots",
  stats: { moveSpeedFlat: 40 },
});

const buildOf = (items: unknown[], b: typeof boots | null = null): BuildInput => ({
  items: items as BuildInput["items"],
  boots: b,
});

const findingIds = (a: ReturnType<typeof analyzeBuild>) => a.findings.map((f) => f.id);
const finding = (a: ReturnType<typeof analyzeBuild>, id: string) => a.findings.find((f) => f.id === id);

describe("damageIdentity", () => {
  it("reads AD scalings as physical", () => {
    expect(damageIdentity(marksman)).toBe("physical");
  });
  it("reads AP scalings as magic", () => {
    expect(damageIdentity(mage)).toBe("magic");
  });
  it("counts bonusAttackDamage toward the AD side", () => {
    expect(damageIdentity(energyChamp)).toBe("physical");
  });
});

describe("analyzeBuild", () => {
  it("returns no findings for an empty build", () => {
    expect(analyzeBuild(marksman, 15, buildOf([])).findings).toEqual([]);
  });

  it("warns on crit chance past 100%", () => {
    const a = analyzeBuild(marksman, 15, buildOf([critSword, critBlade]));
    const f = finding(a, "crit-overcap");
    expect(f?.severity).toBe("warn");
    expect(f?.title).toContain("20%");
  });

  it("does not warn at exactly 100% crit", () => {
    const half = ItemSchema.parse({ id: "h1", name: "h1", cost: 1000, stats: { critChance: 0.5 } });
    const half2 = ItemSchema.parse({ id: "h2", name: "h2", cost: 1000, stats: { critChance: 0.5 } });
    expect(findingIds(analyzeBuild(marksman, 15, buildOf([half, half2])))).not.toContain("crit-overcap");
  });

  it("does not flag low efficiency for items carrying unpriced stats", () => {
    // %armor pen has no GOLD_VALUES entry, so "low value" would be a false claim.
    const penItem = ItemSchema.parse({
      id: "pen-item",
      name: "Pen Item",
      cost: 3000,
      stats: { attackDamage: 20, armorPenPercent: 0.3 },
    });
    expect(findingIds(analyzeBuild(marksman, 15, buildOf([penItem])))).not.toContain("gold-inefficient");
  });

  it("downgrades the crit overcap when Limit Break converts it", () => {
    const a = analyzeBuild(marksman, 15, buildOf([critSword, limitBreaker]));
    expect(finding(a, "crit-overcap")?.severity).toBe("info");
  });

  it("warns on attack speed past the cap", () => {
    // 0.7 base * (1 + 1.5 + 1.5 + level growth) far exceeds 2.5.
    const frenzy2 = ItemSchema.parse({ ...frenzyBlade, id: "frenzy-2" });
    const a = analyzeBuild(marksman, 15, buildOf([frenzyBlade, frenzy2]));
    expect(finding(a, "as-overcap")?.severity).toBe("warn");
  });

  it("warns on mana items for non-mana champions and not for mana users", () => {
    expect(findingIds(analyzeBuild(energyChamp, 15, buildOf([manaTome])))).toContain("mana-waste");
    expect(findingIds(analyzeBuild(mage, 15, buildOf([manaTome])))).not.toContain("mana-waste");
  });

  it("flags AD-heavy builds on AP-scaling kits", () => {
    const a = analyzeBuild(mage, 15, buildOf([bigAxe]));
    expect(finding(a, "identity-mismatch")?.severity).toBe("warn");
  });

  it("suggests boots once the build has three core items", () => {
    const a = analyzeBuild(marksman, 15, buildOf([critSword, bigAxe, hugeAxe]));
    expect(findingIds(a)).toContain("no-boots");
    const withBoots = analyzeBuild(marksman, 15, buildOf([critSword, bigAxe, hugeAxe], boots));
    expect(findingIds(withBoots)).not.toContain("no-boots");
  });

  it("flags a full build with zero defensive stats", () => {
    const a = analyzeBuild(marksman, 15, buildOf([critSword, bigAxe, hugeAxe], boots));
    expect(findingIds(a)).toContain("glass-cannon");
  });

  it("flags low raw-stat gold efficiency as info", () => {
    const a = analyzeBuild(mage, 15, buildOf([overpricedRing]));
    const f = finding(a, "gold-inefficient");
    expect(f?.severity).toBe("info");
    expect(f?.title).toContain("Overpriced Ring");
  });

  it("leads with a clean bill when nothing warns", () => {
    const a = analyzeBuild(marksman, 15, buildOf([bigAxe]));
    expect(a.findings[0]?.id).toBe("clean");
    expect(a.findings[0]?.severity).toBe("good");
  });
});

describe("suggestSwap", () => {
  const catalog = [bigAxe, hugeAxe, manaTome, boots];

  it("finds a strictly better damage item", () => {
    const s = suggestSwap(marksman, 15, buildOf([bigAxe]), TARGET, catalog);
    expect(s?.outId).toBe("big-axe");
    expect(s?.inId).toBe("huge-axe");
    expect(s!.dpsDelta).toBeGreaterThan(0);
    expect(s!.goldDelta).toBe(200);
  });

  it("returns null for AP-scaling champions (autos-only model)", () => {
    expect(suggestSwap(mage, 15, buildOf([bigAxe]), TARGET, catalog)).toBeNull();
  });

  it("never suggests an item already in the build", () => {
    const s = suggestSwap(marksman, 15, buildOf([bigAxe, hugeAxe]), TARGET, [bigAxe, hugeAxe]);
    expect(s).toBeNull();
  });

  it("never suggests a boots-slot item for a core slot, even a strictly better one", () => {
    const opBoots = ItemSchema.parse({
      id: "op-boots",
      name: "OP Boots",
      cost: 100,
      slot: "boots",
      stats: { attackDamage: 500 },
    });
    expect(suggestSwap(marksman, 15, buildOf([bigAxe]), TARGET, [bigAxe, opBoots])).toBeNull();
  });

  it("returns null for an empty build", () => {
    expect(suggestSwap(marksman, 15, buildOf([]), TARGET, catalog)).toBeNull();
  });
});

describe("compareBuilds", () => {
  it("reports DPS, gold, and durability deltas as B minus A", () => {
    const tanky = ItemSchema.parse({
      id: "plate",
      name: "Plate",
      cost: 2900,
      stats: { armor: 60, maxHealth: 300 },
    });
    const v = compareBuilds(marksman, 15, buildOf([hugeAxe]), buildOf([tanky]), TARGET);
    expect(v.dpsA).toBeGreaterThan(v.dpsB);
    expect(v.goldB - v.goldA).toBe(2900 - 3200);
    expect(v.armorDelta).toBe(60);
    expect(v.maxHealthDelta).toBe(300);
    expect(v.magicResistDelta).toBe(0);
  });
});
