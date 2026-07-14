import { describe, it, expect } from "vitest";
import { decodeBuild, encodeBuild, DEFAULT_TARGET, type BuildState } from "../src/state/buildState";
import { items } from "../src/lib/data";

/**
 * Pure reimplementation of the addItem rule from useBuildState so it can be
 * unit-tested without React: max 6 items, and never two of the same item id.
 */
const MAX_ITEMS = 6;
function addItem(b: BuildState, itemId: string): BuildState {
  return b.itemIds.length >= MAX_ITEMS || b.itemIds.includes(itemId)
    ? b
    : { ...b, itemIds: [...b.itemIds, itemId] };
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
