import { describe, it, expect } from "vitest";
import {
  normalizeItem,
  normalizeLoadout,
  slugify,
} from "../scripts/scrape-builds/normalize-items";

/**
 * The normalizer maps third-party item names onto our slugs. A wrong or
 * silently-dropped mapping would corrupt a build, so it must resolve known
 * names exactly and throw loudly on anything unknown.
 */
describe("normalize-items", () => {
  it("slugifies apostrophes and spacing", () => {
    expect(slugify("Serylda's Grudge")).toBe("seryldas-grudge");
    expect(slugify("Blade of the Ruined King")).toBe("blade-of-the-ruined-king");
    expect(slugify("Rabadon's Deathcap")).toBe("rabadons-deathcap");
  });

  it("resolves exact display names to ids + slots", () => {
    expect(normalizeItem("Trinity Force")).toEqual({ id: "trinity-force", slot: "item" });
    expect(normalizeItem("Gluttonous Greaves")).toEqual({ id: "gluttonous-greaves", slot: "boots" });
    expect(normalizeItem("Stasis")).toEqual({ id: "stasis", slot: "enchant" });
  });

  it("resolves the Muramana upgrade form to Manamune", () => {
    expect(normalizeItem("Muramana").id).toBe("manamune");
    expect(normalizeItem("Manamune").id).toBe("manamune");
  });

  it("throws loudly on an unknown item rather than dropping it", () => {
    expect(() => normalizeItem("Zhonya's Hourglass")).toThrowError(/cannot resolve/i);
  });

  it("partitions a loadout into items / boots / enchant by slot", () => {
    const out = normalizeLoadout([
      "Manamune",
      "Trinity Force",
      "Serylda's Grudge",
      "Gluttonous Greaves",
      "Stasis",
    ]);
    expect(out.items).toEqual(["manamune", "trinity-force", "seryldas-grudge"]);
    expect(out.boots).toBe("gluttonous-greaves");
    expect(out.enchant).toBe("stasis");
  });
});
