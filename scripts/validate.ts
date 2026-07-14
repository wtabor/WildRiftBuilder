/**
 * Data validation gate. Run in CI (`npm run validate-data`) so malformed or
 * out-of-schema patch data can never ship. As the hybrid pipeline grows, the
 * importer's output should be piped through this before being committed.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  ChampionsFileSchema,
  ItemsFileSchema,
  PatchMetaSchema,
  BuildsFileSchema,
  type Champion,
  type Item,
} from "../src/lib/schema/index";

const PATCHES_DIR = join(process.cwd(), "data", "patches");

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

let failures = 0;

function check(label: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
  } catch (err) {
    failures++;
    console.error(`  ✗ ${label}`);
    console.error(`    ${err instanceof Error ? err.message : String(err)}`);
  }
}

const patches = existsSync(PATCHES_DIR)
  ? readdirSync(PATCHES_DIR, { withFileTypes: true }).filter((d) => d.isDirectory())
  : [];

if (patches.length === 0) {
  console.error("No patch data found under data/patches/");
  process.exit(1);
}

// Populated per-patch below so the provenance advisory check (after the main
// loop) can diff consecutive patches without re-reading/re-parsing files.
const parsedByPatch = new Map<string, { champions: Champion[]; items: Item[] }>();

for (const dir of patches) {
  const base = join(PATCHES_DIR, dir.name);
  console.log(`Patch ${dir.name}:`);
  check("meta.json", () => PatchMetaSchema.parse(loadJson(join(base, "meta.json"))));

  let champions: Champion[] = [];
  let items: Item[] = [];
  check("champions.json", () => {
    champions = ChampionsFileSchema.parse(loadJson(join(base, "champions.json")));
  });
  check("items.json", () => {
    items = ItemsFileSchema.parse(loadJson(join(base, "items.json")));
  });
  parsedByPatch.set(dir.name, { champions, items });

  // builds.json is optional per patch. When present, validate the schema AND
  // that every reference resolves to a real, correctly-slotted entity — a
  // standing build must never point at a missing or mis-slotted item.
  const buildsPath = join(base, "builds.json");
  if (existsSync(buildsPath)) {
    check("builds.json", () => {
      const builds = BuildsFileSchema.parse(loadJson(buildsPath));
      const champions = ChampionsFileSchema.parse(loadJson(join(base, "champions.json")));
      const items = ItemsFileSchema.parse(loadJson(join(base, "items.json")));
      const champIds = new Set(champions.map((c) => c.id));
      const slotById = new Map(items.map((i) => [i.id, i.slot]));
      const errors: string[] = [];

      const seenIds = new Set<string>();
      for (const b of builds) {
        if (seenIds.has(b.id)) errors.push(`duplicate preset id "${b.id}"`);
        seenIds.add(b.id);
        if (!champIds.has(b.championId)) errors.push(`${b.id}: unknown champion "${b.championId}"`);
        if (new Set(b.items).size !== b.items.length) errors.push(`${b.id}: duplicate items`);
        for (const it of b.items) {
          const slot = slotById.get(it);
          if (!slot) errors.push(`${b.id}: unknown item "${it}"`);
          else if (slot !== "item") errors.push(`${b.id}: "${it}" is a ${slot}, not an item slot`);
        }
        if (b.boots && slotById.get(b.boots) !== "boots") {
          errors.push(`${b.id}: "${b.boots}" is not a boots`);
        }
      }
      if (errors.length) throw new Error(errors.join("\n    "));
    });
  }
}

/**
 * Provenance advisory check — WARNS ONLY, never fails the gate.
 *
 * Stamping `provenance[<key>] = "<patch>"` on a stats/cost change is a manual
 * step (see the `/add-entity` skill, step 6) and is easy to forget in the
 * moment — that's exactly what happened with the patch-7.2 item sweep, which
 * shipped ~25 unstamped stat/cost changes and had to be fixed with a one-off
 * reconstruction script. This check catches that class of mistake early by
 * diffing each patch against the one before it: if a champion/item that
 * existed in the prior patch has a `stats` or `cost` value that differs in
 * the current patch, but the current entity has no provenance stamp for that
 * key, print a warning naming the entity/key.
 *
 * Deliberately advisory, not a build failure:
 * - It's a heuristic (whole-value inequality across two snapshots), not a
 *   substitute for the schema gate above.
 * - A legitimate re-stamp can use a finer sub-patch string (e.g. "7.1b")
 *   rather than the directory name, so this only checks "is *a* stamp
 *   present for this key", not "does it equal this patch exactly".
 * - Brand-new entities (absent from the prior patch) are skipped entirely —
 *   per the skill, those correctly need no stamps at all.
 */
function versionSortKey(dirName: string): [number, number, string] {
  const [majorRaw, minorRaw = ""] = dirName.split(".");
  const major = Number.parseInt(majorRaw, 10) || 0;
  const minorMatch = minorRaw.match(/^(\d+)(.*)$/);
  const minor = minorMatch ? Number.parseInt(minorMatch[1], 10) : 0;
  const suffix = minorMatch ? minorMatch[2] : minorRaw;
  return [major, minor, suffix];
}

function compareVersions(a: string, b: string): number {
  const [aMaj, aMin, aSuf] = versionSortKey(a);
  const [bMaj, bMin, bSuf] = versionSortKey(b);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return aSuf < bSuf ? -1 : aSuf > bSuf ? 1 : 0;
}

interface StampableEntity {
  id: string;
  stats?: Record<string, unknown>;
  cost?: number;
  provenance?: Record<string, string>;
}

function warnUnstampedChanges(
  kind: "champions" | "items",
  patchName: string,
  prev: StampableEntity[],
  curr: StampableEntity[],
): number {
  const prevById = new Map(prev.map((e) => [e.id, e]));
  let warnings = 0;
  for (const entity of curr) {
    const before = prevById.get(entity.id);
    if (!before) continue; // new this patch — no stamp expected

    const statKeys = new Set([
      ...Object.keys(before.stats ?? {}),
      ...Object.keys(entity.stats ?? {}),
    ]);
    for (const key of statKeys) {
      const prevVal = (before.stats ?? {})[key];
      const currVal = (entity.stats ?? {})[key];
      if (JSON.stringify(prevVal) === JSON.stringify(currVal)) continue;
      if (entity.provenance?.[key] === undefined) {
        console.warn(
          `  ! ${patchName}/${kind} "${entity.id}": stats.${key} changed (${JSON.stringify(prevVal)} -> ${JSON.stringify(currVal)}) with no provenance stamp`,
        );
        warnings++;
      }
    }

    if (
      before.cost !== undefined &&
      entity.cost !== undefined &&
      before.cost !== entity.cost &&
      entity.provenance?.cost === undefined
    ) {
      console.warn(
        `  ! ${patchName}/${kind} "${entity.id}": cost changed (${before.cost} -> ${entity.cost}) with no provenance stamp`,
      );
      warnings++;
    }
  }
  return warnings;
}

const orderedPatches = [...parsedByPatch.keys()].sort(compareVersions);
if (orderedPatches.length > 1) {
  console.log("\nProvenance advisory (warnings only, does not fail the gate):");
  let totalWarnings = 0;
  for (let i = 1; i < orderedPatches.length; i++) {
    const prevName = orderedPatches[i - 1];
    const currName = orderedPatches[i];
    const prevSnapshot = parsedByPatch.get(prevName)!;
    const currSnapshot = parsedByPatch.get(currName)!;
    totalWarnings += warnUnstampedChanges(
      "champions",
      currName,
      prevSnapshot.champions,
      currSnapshot.champions,
    );
    totalWarnings += warnUnstampedChanges("items", currName, prevSnapshot.items, currSnapshot.items);
  }
  if (totalWarnings === 0) {
    console.log("  ✓ no unstamped stat/cost changes between consecutive patches");
  } else {
    console.log(
      `  ${totalWarnings} unstamped change(s) found — stamp provenance per the /add-entity skill (step 6).`,
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} validation failure(s).`);
  process.exit(1);
}
console.log("\nAll patch data valid.");
