import { describe, it, expect } from "vitest";
import { CURRENT_PATCH, getPatchInfo, provenanceFor } from "@/lib/data";
import { formatPatchDate } from "@/lib/format";

describe("provenanceFor", () => {
  it("falls back to the baseline patch when no stamp exists", () => {
    expect(provenanceFor(undefined, "cost")).toBe(CURRENT_PATCH);
    expect(provenanceFor({}, "attackDamage")).toBe(CURRENT_PATCH);
    expect(provenanceFor({ cost: "7.1g" }, "attackDamage")).toBe(CURRENT_PATCH);
  });

  it("returns the explicit stamp when present", () => {
    expect(provenanceFor({ cost: "7.0" }, "cost")).toBe("7.0");
  });
});

describe("getPatchInfo", () => {
  it("resolves a registered patch to date + url", () => {
    const info = getPatchInfo(CURRENT_PATCH);
    expect(info).toBeDefined();
    expect(info?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(info?.url).toContain("patch-notes");
  });

  it("returns undefined for unknown or missing versions", () => {
    expect(getPatchInfo(undefined)).toBeUndefined();
    expect(getPatchInfo("0.0")).toBeUndefined();
  });
});

describe("formatPatchDate", () => {
  it("formats ISO dates without timezone drift", () => {
    expect(formatPatchDate("2026-06-01")).toBe("Jun 1, 2026");
  });

  it("returns empty string for missing or invalid input", () => {
    expect(formatPatchDate(undefined)).toBe("");
    expect(formatPatchDate("not-a-date")).toBe("");
  });
});
