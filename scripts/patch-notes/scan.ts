/**
 * Manual patch-scan runner for local/ops use (the scheduled path is the Vercel
 * cron at /api/cron/patch-scan). Fetches the feed and reports staleness; with
 * `--extract` (and ANTHROPIC_API_KEY) it also extracts a changeset and prints it
 * without writing anything.
 *
 *   npx tsx scripts/patch-notes/scan.ts [--extract]
 *
 * Note: requires outbound network to the patch-notes sources, which is blocked
 * in the allowlisted CI/cloud sandbox — run it where the network is open.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fetchPatchNotesFeed, fetchArticleText } from "../../src/lib/patchNotes/fetch";
import { isNewerPatch } from "../../src/lib/patchNotes/version";
import { applyChangeset } from "../../src/lib/patchNotes/changeset";

const ROOT = process.cwd();

function currentPatch(): string {
  const meta = JSON.parse(
    readFileSync(join(ROOT, "data/patches/7.1/meta.json"), "utf8"),
  );
  return meta.patch as string;
}

async function main() {
  const current = currentPatch();
  const feed = await fetchPatchNotesFeed();
  console.log(`Source: ${feed.source}`);
  console.log(`Current shipped patch: ${current}`);
  console.log("Feed (newest first):");
  for (const e of feed.entries.slice(0, 8)) console.log(`  ${e.version}  ${e.url}`);

  const latest = feed.entries[0];
  if (!latest) return console.log("No feed entries found.");

  const stale = isNewerPatch(latest.version, current);
  console.log(`\nLatest: ${latest.version} → ${stale ? "DATA IS STALE" : "up to date"}`);

  if (!stale || !process.argv.includes("--extract")) return;

  const { extractChangeset } = await import("../../src/lib/patchNotes/extract");
  const champions = JSON.parse(
    readFileSync(join(ROOT, "data/overrides/champions.json"), "utf8"),
  );
  const items = JSON.parse(readFileSync(join(ROOT, "data/overrides/items.json"), "utf8"));
  const article = await fetchArticleText(latest.url);
  if (!article) return console.log("Could not fetch article text.");

  const changeset = await extractChangeset(article, { patch: latest.version, champions, items });
  const result = applyChangeset(champions, items, changeset);
  console.log(`\nProposed changeset for ${latest.version}: ${changeset.summary}`);
  console.log(`Applied (${result.applied.length}):`);
  for (const a of result.applied) console.log(`  ${a}`);
  if (result.skipped.length) {
    console.log(`Skipped (${result.skipped.length}):`);
    for (const s of result.skipped) console.log(`  ${s}`);
  }
  console.log("\n(dry run — nothing written)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
