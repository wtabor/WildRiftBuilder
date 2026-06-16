/**
 * Build a patch dataset from the hybrid pipeline:
 *   scraped source snapshot ──(adapter)──> metadata ─┐
 *                                                    ├─(merge)─> champions.json
 *   hand-verified overrides ─────────────────────────┘
 *
 * Items currently come entirely from the overrides layer (an item-source adapter
 * can be added later). Everything is schema-validated before being written, so a
 * malformed snapshot or override fails the build instead of shipping bad data.
 *
 * Usage: npm run build-data [patch]   (defaults to the patch in meta.json)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ItemsFileSchema, PatchMetaSchema } from "../../src/lib/schema/index";
import { parseRy2x } from "./adapters/ry2x";
import { parseRiot } from "./adapters/riot";
import { enrichWithRiot, mergeChampions, parseOverrides } from "./merge";
import { SOURCES } from "./sources";

const ROOT = process.cwd();
const PATCH = process.argv[2] ?? "7.1";
const patchDir = join(ROOT, "data", "patches", PATCH);

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", "utf8");
}

console.log(`Building patch ${PATCH}…\n`);

// 1. Champions: canonical metadata (ry2x) enriched with official Riot metadata,
//    then combined with the hand-verified overrides.
const ry2x = SOURCES.find((s) => s.id === "ry2x")!;
const riot = SOURCES.find((s) => s.id === "riot-wr")!;
const baseMeta = parseRy2x(loadJson(ry2x.snapshot));
const riotMeta = parseRiot(loadJson(riot.snapshot));
const meta = enrichWithRiot(baseMeta, riotMeta);
const overrides = parseOverrides(loadJson("data/overrides/champions.json"));
const { champions, report } = mergeChampions(meta, overrides);

// 2. Items: validated passthrough from the overrides layer.
const items = ItemsFileSchema.parse(loadJson("data/overrides/items.json"));

// 3. Update patch meta with verification status derived from coverage.
const meta_json = PatchMetaSchema.parse(loadJson(`data/patches/${PATCH}/meta.json`));
const fullyVerified = report.emitted.length > 0 && report.unverified.length === 0;
const nextMeta = { ...meta_json, verified: fullyVerified };

// 4. Write outputs.
writeJson(join(patchDir, "champions.json"), champions);
writeJson(join(patchDir, "items.json"), items);
writeJson(join(patchDir, "meta.json"), nextMeta);

// 5. Report.
console.log(`Champions emitted (${report.emitted.length}): ${report.emitted.join(", ")}`);
if (report.missingOverride.length)
  console.log(
    `⚠ In Wild Rift but missing overrides (${report.missingOverride.length}): ${report.missingOverride.join(", ")}`,
  );
if (report.notInWildRift.length)
  console.log(`· Skipped (not in Wild Rift): ${report.notInWildRift.join(", ")}`);
if (report.unverified.length)
  console.log(
    `⚠ Emitted but NOT yet in-game-verified (${report.unverified.length}): ${report.unverified.join(", ")}`,
  );
console.log(`Items: ${items.length}`);
console.log(`\nPatch ${PATCH} ${fullyVerified ? "fully verified ✓" : "contains unverified data"}.`);
console.log("Done.");
