#!/usr/bin/env node
/**
 * Daily data-accuracy check. Scrapes the authoritative Wild Rift sources and
 * verifies that every stat/cost value we ship still appears at the source, so
 * a patch that silently changes a number gets flagged instead of going stale.
 *
 * Sources, in priority order (per project policy):
 *   1. Official Riot patch notes  2. wildriftfire  3. official WR wiki (used here
 *      for machine-readable infoboxes).
 *
 * This is a HEURISTIC heads-up, not a hard verifier: it confirms our numbers are
 * still present in the source text and flags anything that has drifted away for
 * a human (or the add-all pipeline) to reconcile. Exit code 1 if drift is found.
 *
 * Requires FIRECRAWL_API_KEY in the environment (see scripts/daily-verify.sh,
 * which loads it from 1Password). Falls back to a clear error if unset.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const KEY = process.env.FIRECRAWL_API_KEY;
const WIKI = "https://wiki.leagueoflegends.com/en-us/WR:";

// Stat key -> how the value is written at the source (percent stats are *100).
const PERCENT = new Set([
  "attackSpeed", "critChance", "critDamage", "moveSpeedPercent", "armorPenPercent",
  "magicPenPercent", "lifeSteal", "omnivamp", "healAndShieldPower", "tenacity",
]);

function expectedNumbers(stats) {
  const out = [];
  for (const [k, v] of Object.entries(stats)) {
    out.push({ key: k, num: PERCENT.has(k) ? Math.round(v * 1000) / 10 : v });
  }
  return out;
}

async function scrape(title) {
  const body = JSON.stringify({
    url: WIKI + title.replace(/ /g, "_"),
    formats: ["markdown"], onlyMainContent: true, waitFor: 1200,
  });
  const r = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json" },
    body,
  });
  const d = await r.json();
  return (d.data && d.data.markdown) || "";
}

function present(text, num) {
  // Match the number as a standalone token (allow trailing % and decimals).
  const n = String(num).replace(".", "\\.");
  return new RegExp(`(^|[^\\d.])${n}([^\\d.]|$)`).test(text);
}

async function main() {
  if (!KEY) {
    console.error("FIRECRAWL_API_KEY not set. Run via scripts/daily-verify.sh (loads it from 1Password).");
    process.exit(2);
  }
  const items = JSON.parse(readFileSync(join(ROOT, "data/patches/7.1/items.json")));
  const champions = JSON.parse(readFileSync(join(ROOT, "data/patches/7.1/champions.json")));
  const drift = [];

  for (const it of items) {
    let text;
    try { text = await scrape(it.name); } catch (e) { drift.push({ name: it.name, error: String(e) }); continue; }
    if (text.length < 1000) { drift.push({ name: it.name, error: "page not found / empty" }); continue; }
    const missing = [];
    if (it.cost) {
      const near = text.slice(Math.max(0, text.indexOf("Cost")), text.indexOf("Cost") + 60);
      if (!present(near || text, it.cost)) missing.push(`cost ${it.cost}`);
    }
    for (const { key, num } of expectedNumbers(it.stats)) {
      if (!present(text, num)) missing.push(`${key}=${num}`);
    }
    if (missing.length) drift.push({ name: it.name, missing });
    await new Promise((r) => setTimeout(r, 250));
  }

  // Champions: verify a couple of high-signal base values (health, AD) are present.
  for (const c of champions) {
    let text;
    try { text = await scrape(c.name); } catch (e) { drift.push({ name: c.name, error: String(e) }); continue; }
    if (text.length < 1000) { drift.push({ name: c.name, error: "page not found / empty" }); continue; }
    const missing = [];
    const hpBase = c.stats?.maxHealth?.base;
    const adBase = c.stats?.attackDamage?.base;
    if (hpBase && !present(text, hpBase)) missing.push(`health.base ${hpBase}`);
    if (adBase && !present(text, adBase)) missing.push(`ad.base ${adBase}`);
    if (missing.length) drift.push({ name: c.name, missing });
    await new Promise((r) => setTimeout(r, 250));
  }

  if (drift.length === 0) {
    console.log(`✓ data-verify: all ${items.length} items + ${champions.length} champions match the source.`);
    process.exit(0);
  }
  console.log(`⚠ data-verify: ${drift.length} entries drifted from the source — review:`);
  for (const d of drift) console.log("  -", d.name + ":", d.error || d.missing.join(", "));
  process.exit(1);
}

main();
