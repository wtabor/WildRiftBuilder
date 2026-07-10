/**
 * Build-scraper pipeline (prototype: Ezreal).
 *
 * Produces the curated "standing builds" in data/patches/<patch>/builds.json by
 * combining two things with very different cadences and provenance:
 *
 *   1. LIVE champion stats  — win / pick / ban / tier / role, scraped from
 *      wr-meta.com's server-rendered `nFsData` blob. Refreshes ~daily; this is
 *      the automatable part (a daily GitHub Action can re-run it).
 *   2. The item loadout     — editorial, hand-authored and cross-checked against
 *      >=2 WR sources (wr-meta + wildriftfire). No public WR source publishes
 *      per-loadout win rates the way the in-game "Popular Loadouts" screen does,
 *      so the stats describe the CHAMPION (by role), not the exact item set.
 *
 * Every item name is resolved through normalize-items.ts, which throws on any
 * name it can't map — a build must never point at a missing/mis-slotted item.
 *
 * Run:  npx tsx scripts/scrape-builds/index.ts [--write]
 *       (omit --write for a dry run that prints the JSON)
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BuildsFileSchema, type BuildPreset } from "../../src/lib/schema";
import { normalizeLoadout } from "./normalize-items";

const PATCH = "7.1";
const BUILDS_PATH = join(process.cwd(), "data", "patches", PATCH, "builds.json");

/** Rank-bracket key within nFsData to read stats from ("1" = broadest bracket). */
const STATS_BRACKET = "1";

type FsEntry = {
  role_label?: string;
  win?: string;
  pick?: string;
  ban?: string;
  tierLabel?: string;
};

export type LiveStats = {
  role?: string;
  tier?: string;
  winRate?: number;
  pickRate?: number;
  banRate?: number;
  updatedAt?: string;
};

const MONTHS: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

/** Parse wr-meta's "Updated: <b>07 JUL 2026 UTC 00:00</b>" into "2026-07-07". */
function parseUpdatedAt(html: string): string | undefined {
  const m = html.match(/Updated:\s*<b>\s*(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/i);
  if (!m) return undefined;
  const [, day, mon, year] = m;
  const mm = MONTHS[mon.toUpperCase()];
  if (!mm) return undefined;
  return `${year}-${mm}-${day.padStart(2, "0")}`;
}

/** Pull the server-rendered nFsData JSON and read one rank bracket's stats. */
function parseLiveStats(html: string): LiveStats {
  const marker = "nFsData'>";
  const at = html.indexOf(marker);
  if (at < 0) throw new Error("scrape: nFsData blob not found — page layout changed?");
  // The blob is `{"1":[{...}],"2":[{...}],...}`; grab up to the balanced close.
  const raw = extractBalancedObject(html, at + marker.length);
  let data: Record<string, FsEntry[]>;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`scrape: nFsData did not parse as JSON (${(e as Error).message}).`);
  }
  const entry = data[STATS_BRACKET]?.[0];
  if (!entry) throw new Error(`scrape: no stats for bracket "${STATS_BRACKET}".`);
  const num = (s?: string) => (s != null && s !== "" ? Number(s) : undefined);
  return {
    role: entry.role_label,
    tier: entry.tierLabel,
    winRate: num(entry.win),
    pickRate: num(entry.pick),
    banRate: num(entry.ban),
    updatedAt: parseUpdatedAt(html),
  };
}

/** Read a balanced {...} starting at `start` (first char must be `{`). */
function extractBalancedObject(s: string, start: number): string {
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  throw new Error("scrape: unbalanced nFsData object.");
}

async function fetchLiveStats(url: string): Promise<LiveStats> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" },
  });
  if (!res.ok) throw new Error(`scrape: ${url} returned ${res.status}`);
  return parseLiveStats(await res.text());
}

/**
 * Per-champion config: the wr-meta stats URL + the cross-checked item loadout(s).
 * The loadout is editorial (verified against the `sources` listed); the stats
 * come live from `statsUrl`. Extend this map to scale past the prototype.
 */
type ChampionConfig = {
  championId: string;
  statsUrl: string;
  sources: string[];
  builds: Array<{
    id: string;
    name: string;
    archetype: BuildPreset["archetype"];
    description: string;
    /** Raw item names (any WR-source spelling); resolved via the normalizer. */
    loadout: string[];
    level?: number;
  }>;
};

const CONFIG: ChampionConfig[] = [
  {
    championId: "ezreal",
    statsUrl: "https://wr-meta.com/40-ezreal.html",
    sources: ["https://wr-meta.com/40-ezreal.html", "https://www.wildriftfire.com/guide/ezreal"],
    builds: [
      {
        id: "ezreal-meta-ad",
        name: "Meta AD",
        archetype: "ability",
        description:
          "The current duo-lane standard: Manamune fuels the mana-hungry Q spam, Trinity Force and Spear of Shojin turn every Mystic Shot into a Sheen proc, and Serylda's plus Blade shred through armored front lines. Guardian Angel is the safety last item.",
        loadout: [
          "Manamune",
          "Trinity Force",
          "Serylda's Grudge",
          "Spear of Shojin",
          "Blade of the Ruined King",
          "Guardian Angel",
          "Gluttonous Greaves",
          "Stasis",
        ],
      },
    ],
  },
];

async function main() {
  const write = process.argv.includes("--write");

  // Preserve builds for champions we aren't regenerating this run.
  const existing = BuildsFileSchema.parse(JSON.parse(readFileSync(BUILDS_PATH, "utf8")));
  const regenerated = new Set(CONFIG.map((c) => c.championId));
  const kept = existing.filter((b) => !regenerated.has(b.championId));

  const fresh: BuildPreset[] = [];
  for (const champ of CONFIG) {
    const stats = await fetchLiveStats(champ.statsUrl);
    console.error(
      `${champ.championId}: ${stats.tier ?? "?"} tier · ${stats.winRate ?? "?"}% WR · ` +
        `${stats.pickRate ?? "?"}% pick · updated ${stats.updatedAt ?? "?"}`,
    );
    for (const b of champ.builds) {
      const { items, boots, enchant } = normalizeLoadout(b.loadout);
      fresh.push(
        BuildPresetSchemaSafe({
          id: b.id,
          championId: champ.championId,
          name: b.name,
          archetype: b.archetype,
          description: b.description,
          items,
          boots,
          enchant,
          level: b.level ?? 15,
          source: champ.sources[0],
          meme: false,
          stats,
        }),
      );
    }
  }

  const merged = BuildsFileSchema.parse([...kept, ...fresh]);
  const json = JSON.stringify(merged, null, 2) + "\n";
  if (write) {
    writeFileSync(BUILDS_PATH, json);
    console.error(`\nWrote ${merged.length} builds to ${BUILDS_PATH}`);
  } else {
    process.stdout.write(json);
    console.error(`\n(dry run — pass --write to save ${merged.length} builds)`);
  }
}

/** Parse-through so a malformed build fails here, not at app load. */
function BuildPresetSchemaSafe(obj: unknown): BuildPreset {
  return BuildsFileSchema.element.parse(obj);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
