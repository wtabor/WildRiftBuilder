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
}

if (failures > 0) {
  console.error(`\n${failures} validation failure(s).`);
  process.exit(1);
}
console.log("\nAll patch data valid.");
