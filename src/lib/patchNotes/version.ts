/**
 * Wild Rift patch versions look like "7.1g", "7.0", "6.3f": major.minor plus an
 * optional letter revision. This module parses and orders them so we can tell
 * whether the live patch is newer than the one our dataset ships.
 */

export interface PatchVersion {
  major: number;
  minor: number;
  /** Letter revision as a number: none = 0, a = 1, b = 2 … */
  rev: number;
  raw: string;
}

const VERSION_RE = /^(\d+)\.(\d+)([a-z])?$/i;

/** Parse "7.1g" → {major:7, minor:1, rev:7}. Returns null if unparseable. */
export function parsePatchVersion(raw: string): PatchVersion | null {
  const m = raw.trim().toLowerCase().match(VERSION_RE);
  if (!m) return null;
  const rev = m[3] ? m[3].charCodeAt(0) - 96 : 0; // 'a' → 1
  return { major: Number(m[1]), minor: Number(m[2]), rev, raw: raw.trim() };
}

/** Compare two versions: negative if a < b, positive if a > b, 0 if equal. */
export function comparePatch(a: PatchVersion, b: PatchVersion): number {
  return a.major - b.major || a.minor - b.minor || a.rev - b.rev;
}

/** True if `candidate` is a strictly newer patch than `current`. */
export function isNewerPatch(candidate: string, current: string): boolean {
  const c = parsePatchVersion(candidate);
  const cur = parsePatchVersion(current);
  if (!c || !cur) return false;
  return comparePatch(c, cur) > 0;
}

/** Sort raw version strings newest-first; unparseable ones sink to the end. */
export function sortVersionsDesc(versions: string[]): string[] {
  return [...versions].sort((a, b) => {
    const pa = parsePatchVersion(a);
    const pb = parsePatchVersion(b);
    if (!pa && !pb) return 0;
    if (!pa) return 1;
    if (!pb) return -1;
    return comparePatch(pb, pa);
  });
}
