import { describe, it, expect } from "vitest";
import {
  parsePatchVersion,
  comparePatch,
  isNewerPatch,
  sortVersionsDesc,
} from "../src/lib/patchNotes/version";
import {
  parseOfficialFeed,
  parseFallbackFeed,
  slugToVersion,
  versionToSlug,
} from "../src/lib/patchNotes/feed";
import { applyChangeset, ChangesetSchema } from "../src/lib/patchNotes/changeset";

describe("patch version parsing & ordering", () => {
  it("parses major.minor and letter revisions", () => {
    expect(parsePatchVersion("7.1g")).toMatchObject({ major: 7, minor: 1, rev: 7 });
    expect(parsePatchVersion("7.1")).toMatchObject({ major: 7, minor: 1, rev: 0 });
    expect(parsePatchVersion("nope")).toBeNull();
  });

  it("orders revisions after the base patch", () => {
    expect(comparePatch(parsePatchVersion("7.1a")!, parsePatchVersion("7.1")!)).toBeGreaterThan(0);
    expect(comparePatch(parsePatchVersion("7.1g")!, parsePatchVersion("7.1c")!)).toBeGreaterThan(0);
    expect(comparePatch(parsePatchVersion("7.0g")!, parsePatchVersion("7.1")!)).toBeLessThan(0);
  });

  it("detects newer patches", () => {
    expect(isNewerPatch("7.1g", "7.1")).toBe(true);
    expect(isNewerPatch("7.1", "7.1g")).toBe(false);
    expect(isNewerPatch("7.2", "7.1g")).toBe(true);
  });

  it("sorts newest-first", () => {
    expect(sortVersionsDesc(["7.0g", "7.1g", "7.1", "6.3f"])).toEqual([
      "7.1g",
      "7.1",
      "7.0g",
      "6.3f",
    ]);
  });
});

describe("slug <-> version", () => {
  it("round-trips", () => {
    expect(slugToVersion("wild-rift-patch-notes-7-1g")).toBe("7.1g");
    expect(versionToSlug("7.1g")).toBe("wild-rift-patch-notes-7-1g");
    expect(versionToSlug("7.1")).toBe("wild-rift-patch-notes-7-1");
  });
});

describe("feed parsers", () => {
  it("extracts and orders official patch-note links", () => {
    const html = `
      <a href="/en-us/news/game-updates/wild-rift-patch-notes-7-1g/">7.1g</a>
      <a href="/en-us/news/game-updates/wild-rift-patch-notes-7-1f/">7.1f</a>
      <a href="https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-7-0g/">old</a>
      <a href="/en-us/news/something-else/">nope</a>`;
    const feed = parseOfficialFeed(html);
    expect(feed.map((e) => e.version)).toEqual(["7.1g", "7.1f", "7.0g"]);
    expect(feed[0].url).toContain("wildrift.leagueoflegends.com");
  });

  it("falls back to text mentions and links", () => {
    const feed = parseFallbackFeed(
      `<a href="/patches/7-1g">Patch Notes 7.1g</a> ... also Patch Notes 7.0g`,
      "https://www.riftpatchnotes.com",
    );
    expect(feed[0].version).toBe("7.1g");
    expect(feed.some((e) => e.version === "7.0g")).toBe(true);
  });
});

describe("applyChangeset", () => {
  const champions = {
    _comment: "doc",
    ahri: { stats: { attackDamage: { base: 53, perLevel: 3 }, moveSpeed: 330 } },
  };
  const items = [{ id: "infinity-edge", cost: 3400, stats: { attackDamage: 65 } }];

  it("applies champion and item numeric edits without mutating inputs", () => {
    const changeset = ChangesetSchema.parse({
      patch: "7.2",
      summary: "test",
      ops: [
        { kind: "champion-stat", championId: "ahri", path: "attackDamage.base", to: 55 },
        { kind: "champion-stat", championId: "ahri", path: "moveSpeed", to: 335 },
        { kind: "item-stat", itemId: "infinity-edge", field: "attackDamage", to: 70 },
        { kind: "item-stat", itemId: "infinity-edge", field: "cost", to: 3200 },
      ],
    });
    const result = applyChangeset(champions, items, changeset);

    expect(result.applied).toHaveLength(4);
    expect((result.champions.ahri as any).stats.attackDamage.base).toBe(55);
    expect((result.champions.ahri as any).stats.moveSpeed).toBe(335);
    expect((result.items[0] as any).stats.attackDamage).toBe(70);
    expect((result.items[0] as any).cost).toBe(3200);
    // inputs untouched
    expect(champions.ahri.stats.attackDamage.base).toBe(53);
    expect(items[0].cost).toBe(3400);
    // doc key preserved
    expect(result.champions._comment).toBe("doc");
  });

  it("reports unmatched ops instead of throwing", () => {
    const changeset = ChangesetSchema.parse({
      patch: "7.2",
      summary: "test",
      ops: [
        { kind: "champion-stat", championId: "garen", path: "attackDamage.base", to: 99 },
        { kind: "item-stat", itemId: "nonexistent", field: "cost", to: 1 },
      ],
    });
    const result = applyChangeset(champions, items, changeset);
    expect(result.applied).toHaveLength(0);
    expect(result.skipped).toHaveLength(2);
  });
});
