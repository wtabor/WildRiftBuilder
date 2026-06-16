import {
  parseOfficialFeed,
  parseFallbackFeed,
  type PatchNoteEntry,
} from "./feed";

/**
 * Live fetchers for the patch-notes feed and article bodies. The official Riot
 * site is bot-protected, so we send browser-like headers and fall back to a
 * third-party mirror. Network-only — not exercised in unit tests (the parsers in
 * feed.ts are tested against fixtures instead).
 */

const OFFICIAL_INDEX = "https://wildrift.leagueoflegends.com/en-us/news/tags/patch-notes/";
const FALLBACK_INDEX = "https://www.riftpatchnotes.com/patches";

const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

async function getText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export interface FeedResult {
  entries: PatchNoteEntry[];
  source: "official" | "fallback" | "none";
}

/** Fetch the patch-notes feed: try official first, then the mirror. */
export async function fetchPatchNotesFeed(): Promise<FeedResult> {
  const officialHtml = await getText(OFFICIAL_INDEX);
  if (officialHtml) {
    const entries = parseOfficialFeed(officialHtml);
    if (entries.length) return { entries, source: "official" };
  }
  const fallbackHtml = await getText(FALLBACK_INDEX);
  if (fallbackHtml) {
    const entries = parseFallbackFeed(fallbackHtml, "https://www.riftpatchnotes.com");
    if (entries.length) return { entries, source: "fallback" };
  }
  return { entries: [], source: "none" };
}

/** Fetch a patch-note article and return its text (very lightly de-HTML'd). */
export async function fetchArticleText(url: string): Promise<string | null> {
  const html = await getText(url);
  if (!html) return null;
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
