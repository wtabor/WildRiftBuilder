import { describe, it, expect } from "vitest";
import { parseRy2x } from "../scripts/import/adapters/ry2x";
import { parseRiot } from "../scripts/import/adapters/riot";
import {
  enrichWithRiot,
  mergeChampions,
  parseOverrides,
} from "../scripts/import/merge";

const rawSnapshot = [
  {
    key: "ahri",
    hero_id: 103,
    name: "Ahri",
    title: "the Nine-Tailed Fox",
    classes: ["mage", "assassin"],
    lanes: ["mid"],
    is_wr: true,
  },
  {
    key: "teemo",
    hero_id: 17,
    name: "Teemo",
    title: "the Swift Scout",
    classes: ["marksman"],
    lanes: ["baron"],
    is_wr: false,
  },
  {
    key: "jinx",
    hero_id: 222,
    name: "Jinx",
    title: "the Loose Cannon",
    classes: ["marksman"],
    lanes: ["dragon"],
    is_wr: true,
  },
];

const statsBlock = {
  attackDamage: { base: 53, perLevel: 3 },
  attackSpeed: { base: 0.668, perLevel: 0.02 },
  armor: { base: 21, perLevel: 3.5 },
  magicResist: { base: 30, perLevel: 1.3 },
  maxHealth: { base: 590, perLevel: 96 },
  healthRegen: { base: 2.5, perLevel: 0.6 },
  mana: { base: 418, perLevel: 25 },
  manaRegen: { base: 8, perLevel: 0.8 },
  moveSpeed: 330,
  critDamageBase: 0.75,
};

const rawOverrides = {
  _comment: "ignored documentation key",
  ahri: { verified: true, resourceType: "mana", stats: statsBlock, abilities: [] },
  // jinx is in WR but intentionally has no override here.
};

describe("parseRy2x", () => {
  it("maps classes to role labels and preserves WR availability", () => {
    const meta = parseRy2x(rawSnapshot);
    const ahri = meta.find((m) => m.key === "ahri")!;
    expect(ahri.roles).toEqual(["Mage", "Assassin"]);
    expect(ahri.availableInWildRift).toBe(true);
    expect(meta.find((m) => m.key === "teemo")!.availableInWildRift).toBe(false);
  });
});

describe("parseOverrides", () => {
  it("skips underscore-prefixed documentation keys", () => {
    const ov = parseOverrides(rawOverrides);
    expect(Object.keys(ov)).toEqual(["ahri"]);
  });
});

const rawRiot = [
  {
    key: "ahri",
    name: "Ahri",
    title: "the Nine-Tailed Fox",
    roles: ["Mage", "Assassin"],
    image: "https://wildrift.leagueoflegends.com/static/champions/ahri.jpg",
  },
  // Riot-only champion that ry2x doesn't list — must be ignored.
  { key: "yuumi", name: "Yuumi", title: "the Magical Cat", roles: ["Support"] },
];

describe("parseRiot + enrichWithRiot", () => {
  it("enriches matching champions with title, roles, and art", () => {
    const base = parseRy2x(rawSnapshot);
    const enriched = enrichWithRiot(base, parseRiot(rawRiot));
    const ahri = enriched.find((m) => m.key === "ahri")!;
    expect(ahri.imageUrl).toContain("ahri.jpg");
    expect(ahri.roles).toEqual(["Mage", "Assassin"]);
    // ry2x stays the source of truth for availability.
    expect(ahri.availableInWildRift).toBe(true);
  });

  it("ignores Riot-only champions not in the canonical roster", () => {
    const base = parseRy2x(rawSnapshot);
    const enriched = enrichWithRiot(base, parseRiot(rawRiot));
    expect(enriched.find((m) => m.key === "yuumi")).toBeUndefined();
  });
});

describe("mergeChampions", () => {
  const meta = enrichWithRiot(parseRy2x(rawSnapshot), parseRiot(rawRiot));
  const overrides = parseOverrides(rawOverrides);
  const { champions, report } = mergeChampions(meta, overrides, "7.1");

  it("emits only WR champions that have an override", () => {
    expect(report.emitted).toEqual(["ahri"]);
    expect(champions).toHaveLength(1);
    expect(champions[0].id).toBe("ahri");
  });

  it("reports a WR champion missing its override", () => {
    expect(report.missingOverride).toContain("jinx");
  });

  it("skips champions not available in Wild Rift", () => {
    expect(report.notInWildRift).toContain("teemo");
  });

  it("tracks verification status", () => {
    expect(report.unverified).not.toContain("ahri"); // override marked verified
  });

  it("produces schema-valid champions with merged metadata and Riot art", () => {
    expect(champions[0].roles).toEqual(["Mage", "Assassin"]);
    expect(champions[0].stats.attackDamage.base).toBe(53);
    expect(champions[0].icon).toContain("ahri.jpg");
  });

  it("fills per-stat provenance, defaulting to the baseline patch", () => {
    // ahri override has no provenance → every displayed stat defaults to baseline.
    expect(champions[0].provenance.attackDamage).toBe("7.1");
    expect(champions[0].provenance.moveSpeedFlat).toBe("7.1");
  });
});
