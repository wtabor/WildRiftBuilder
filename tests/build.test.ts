import { describe, it, expect } from "vitest";
import { decodeBuild, encodeBuild, DEFAULT_TARGET, type BuildState } from "../src/state/buildState";
import { conflictingItemFor, getItem, items } from "../src/lib/data";
import { goldEfficiency } from "../src/lib/stats/engine";

/**
 * Pure reimplementation of the addItem rule from useBuildState so it can be
 * unit-tested without React: max 6 items, never two of the same item id, and
 * never two mutually exclusive items. The exclusivity check calls the same
 * `conflictingItemFor` the hook does, so that rule can't drift between the two.
 */
const MAX_ITEMS = 6;
function addItem(b: BuildState, itemId: string): BuildState {
  if (b.itemIds.length >= MAX_ITEMS || b.itemIds.includes(itemId)) return b;
  const held = b.bootsId ? [...b.itemIds, b.bootsId] : b.itemIds;
  if (conflictingItemFor(held, itemId)) return b;
  return { ...b, itemIds: [...b.itemIds, itemId] };
}

const base: BuildState = {
  championId: "ashe",
  level: 1,
  itemIds: [],
  bootsId: null,
  itemIdsB: [],
  bootsIdB: null,
  compare: false,
  active: "A",
  target: DEFAULT_TARGET,
};

describe("addItem dedup rule", () => {
  it("adds a new item", () => {
    expect(addItem(base, "bloodthirster").itemIds).toEqual(["bloodthirster"]);
  });

  it("never adds the same item id twice", () => {
    const once = addItem(base, "bloodthirster");
    const twice = addItem(once, "bloodthirster");
    expect(twice.itemIds).toEqual(["bloodthirster"]);
    // Identity is preserved when the add is a no-op.
    expect(twice).toBe(once);
  });

  it("caps the build at 6 items", () => {
    let b = base;
    for (const id of ["a", "b", "c", "d", "e", "f", "g"]) b = addItem(b, id);
    expect(b.itemIds).toHaveLength(MAX_ITEMS);
  });
});

/**
 * "Limited to 1 Tear of the Goddess item" — the whole Tear line is mutually
 * exclusive in-game, so a build must never stack a component, an item built
 * from it, and that item's transform (which would triple-count their mana).
 */
describe("exclusive-group rule (Tear line)", () => {
  const TEAR_LINE = [
    "tear-of-the-goddess",
    "manamune",
    "muramana",
    "archangels-staff",
    "seraphs-embrace",
    "winters-approach",
    "fimbulwinter",
  ];

  it("has every Tear-line item in the dataset, in one exclusive group", () => {
    for (const id of TEAR_LINE) {
      const it = getItem(id);
      expect(it, `${id} missing from the dataset`).toBeDefined();
      expect(it!.exclusiveGroup, `${id} is not grouped`).toBe("tear");
    }
  });

  it("blocks a transform when its base item is held, and vice versa", () => {
    expect(addItem(addItem(base, "manamune"), "muramana").itemIds).toEqual(["manamune"]);
    expect(addItem(addItem(base, "muramana"), "manamune").itemIds).toEqual(["muramana"]);
  });

  it("blocks a second Tear-line item from a different sub-line", () => {
    // Archangel's and Manamune never coexist, despite being unrelated upgrades.
    expect(addItem(addItem(base, "archangels-staff"), "manamune").itemIds).toEqual([
      "archangels-staff",
    ]);
  });

  it("blocks the component once anything built from it is held", () => {
    expect(addItem(addItem(base, "seraphs-embrace"), "tear-of-the-goddess").itemIds).toEqual([
      "seraphs-embrace",
    ]);
  });

  it("allows at most one Tear-line item no matter the add order", () => {
    let b = base;
    for (const id of TEAR_LINE) b = addItem(b, id);
    expect(b.itemIds).toEqual(["tear-of-the-goddess"]);
  });

  it("leaves unrelated items completely unaffected", () => {
    const b = addItem(addItem(addItem(base, "manamune"), "infinity-edge"), "bloodthirster");
    expect(b.itemIds).toEqual(["manamune", "infinity-edge", "bloodthirster"]);
  });

  it("preserves object identity when an add is blocked", () => {
    const once = addItem(base, "manamune");
    expect(addItem(once, "muramana")).toBe(once);
  });

  it("reports no gold efficiency for unbuyable transform items", () => {
    // Muramana's 1000 mana is mostly stacked, not purchased — pricing it
    // against Manamune's 2700g cost reads as ~200% efficient, which is fiction.
    for (const id of ["muramana", "seraphs-embrace", "fimbulwinter"]) {
      expect(goldEfficiency(getItem(id)!), `${id} should have no gold eff`).toBeNull();
    }
    // The buyable base items still report normally.
    for (const id of ["manamune", "archangels-staff", "winters-approach"]) {
      expect(goldEfficiency(getItem(id)!), `${id} should have gold eff`).not.toBeNull();
    }
  });

  it("every upgradesFrom resolves and shares its base item's group", () => {
    for (const it of items) {
      if (!it.upgradesFrom) continue;
      const from = getItem(it.upgradesFrom);
      expect(from, `${it.id}: upgradesFrom "${it.upgradesFrom}" not found`).toBeDefined();
      expect(it.exclusiveGroup).toBe(from!.exclusiveGroup);
    }
  });
});

describe("encode/decode round-trip", () => {
  it("preserves a build through the URL", () => {
    const b: BuildState = {
      championId: "ashe", level: 7, itemIds: ["infinity-edge"],
      bootsId: null, itemIdsB: [], bootsIdB: null,
      compare: false, active: "A", target: DEFAULT_TARGET,
    };
    expect(decodeBuild(encodeBuild(b))).toEqual(b);
  });

  it("preserves a two-build comparison through the URL", () => {
    const b: BuildState = {
      championId: "ashe", level: 9, itemIds: ["infinity-edge"],
      bootsId: null,
      itemIdsB: ["bloodthirster", "phantom-dancer"], bootsIdB: null,
      compare: true, active: "B", target: DEFAULT_TARGET,
    };
    expect(decodeBuild(encodeBuild(b))).toEqual(b);
  });

  it("preserves boots + a custom target through the URL", () => {
    const b: BuildState = {
      championId: "ashe", level: 12, itemIds: ["infinity-edge"],
      bootsId: "berserkers-greaves",
      itemIdsB: ["bloodthirster"], bootsIdB: "plated-steelcaps",
      compare: true, active: "A",
      target: { armor: 150, magicResist: 80, maxHealth: 2500 },
    };
    expect(decodeBuild(encodeBuild(b))).toEqual(b);
  });
});

describe("item effects data", () => {
  it("every item has at least one effect", () => {
    for (const it of items) {
      expect(it.effects.length, `${it.id} should have >=1 effect`).toBeGreaterThanOrEqual(1);
    }
  });

  it("every effect has a name and a non-trivial description", () => {
    // Some real passives are legitimately terse (e.g. "+5% move speed."), so we
    // assert a meaningful floor rather than a long-prose minimum.
    for (const it of items) {
      for (const e of it.effects) {
        expect(e.name.length, `${it.id} effect missing name`).toBeGreaterThan(1);
        expect(
          e.description.length,
          `${it.id} / ${e.name} description too short`,
        ).toBeGreaterThanOrEqual(10);
      }
    }
  });
});
