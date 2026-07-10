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

for (const dir of patches) {
  const base = join(PATCHES_DIR, dir.name);
  console.log(`Patch ${dir.name}:`);
  check("meta.json", () => PatchMetaSchema.parse(loadJson(join(base, "meta.json"))));
  check("champions.json", () =>
    ChampionsFileSchema.parse(loadJson(join(base, "champions.json"))),
  );
  check("items.json", () => ItemsFileSchema.parse(loadJson(join(base, "items.json"))));

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

if (failures > 0) {
  console.error(`\n${failures} validation failure(s).`);
  process.exit(1);
}
console.log("\nAll patch data valid.");
