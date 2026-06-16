import { parsePatchVersion, comparePatch } from "./version";

/**
 * Parsers that turn a fetched patch-notes page into an ordered feed of
 * {version, url, title}. Kept pure (string → entries) so they're unit-testable
 * against fixtures — the live fetch (which is bot-protected and can't run from
 * CI) lives in fetch.ts.
 */

export interface PatchNoteEntry {
  /** Normalized patch version, e.g. "7.1g". */
  version: string;
  /** Absolute URL to the patch-note article. */
  url: string;
  title: string;
}

const OFFICIAL_HOST = "https://wildrift.leagueoflegends.com";

/** "wild-rift-patch-notes-7-1g" → "7.1g" */
export function slugToVersion(slug: string): string | null {
  const m = slug.match(/wild-rift-patch-notes-(\d+)-(\d+)([a-z])?/i);
  if (!m) return null;
  return `${m[1]}.${m[2]}${m[3] ? m[3].toLowerCase() : ""}`;
}

/** "7.1g" → "wild-rift-patch-notes-7-1g" */
export function versionToSlug(version: string): string {
  const v = parsePatchVersion(version);
  if (!v) throw new Error(`Bad version: ${version}`);
  return `wild-rift-patch-notes-${v.major}-${v.minor}${v.rev ? String.fromCharCode(96 + v.rev) : ""}`;
}

function dedupeAndSort(entries: PatchNoteEntry[]): PatchNoteEntry[] {
  const byVersion = new Map<string, PatchNoteEntry>();
  for (const e of entries) if (!byVersion.has(e.version)) byVersion.set(e.version, e);
  return [...byVersion.values()].sort((a, b) => {
    const pa = parsePatchVersion(a.version)!;
    const pb = parsePatchVersion(b.version)!;
    return comparePatch(pb, pa); // newest first
  });
}

/**
 * Parse the official Riot patch-notes index. Works off the article href slugs
 * rather than DOM structure, so it's resilient to markup changes.
 */
export function parseOfficialFeed(html: string): PatchNoteEntry[] {
  const entries: PatchNoteEntry[] = [];
  const re = /href="([^"]*wild-rift-patch-notes-\d+-\d+[a-z]?\/?)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1];
    const version = slugToVersion(href);
    if (!version) continue;
    const url = href.startsWith("http")
      ? href
      : `${OFFICIAL_HOST}${href.startsWith("/") ? "" : "/"}${href}`;
    entries.push({ version, url, title: `Wild Rift Patch Notes ${version}` });
  }
  return dedupeAndSort(entries);
}

/**
 * Fallback parser for a third-party mirror or plain text: pick up any
 * "patch notes 7.1g" mentions and any patch-note links present.
 */
export function parseFallbackFeed(text: string, baseUrl = ""): PatchNoteEntry[] {
  const entries: PatchNoteEntry[] = [];

  const linkRe = /href="([^"]*patch[^"]*?(\d+)[-.](\d+)([a-z])?[^"]*)"/gi;
  let lm: RegExpExecArray | null;
  while ((lm = linkRe.exec(text))) {
    const version = `${lm[2]}.${lm[3]}${lm[4] ? lm[4].toLowerCase() : ""}`;
    if (!parsePatchVersion(version)) continue;
    const href = lm[1];
    const url = href.startsWith("http") ? href : `${baseUrl}${href}`;
    entries.push({ version, url, title: `Wild Rift Patch Notes ${version}` });
  }

  const textRe = /patch\s*notes?\s*(\d+)\.(\d+)([a-z])?/gi;
  let tm: RegExpExecArray | null;
  while ((tm = textRe.exec(text))) {
    const version = `${tm[1]}.${tm[2]}${tm[3] ? tm[3].toLowerCase() : ""}`;
    if (!parsePatchVersion(version)) continue;
    entries.push({ version, url: baseUrl, title: `Wild Rift Patch Notes ${version}` });
  }

  return dedupeAndSort(entries);
}

/** The newest entry in a feed, or null if empty. */
export function latestEntry(entries: PatchNoteEntry[]): PatchNoteEntry | null {
  return entries[0] ?? null;
}
