import { z } from "zod";

/**
 * Adapter for Riot's official Wild Rift website champion content
 * (wildrift.leagueoflegends.com). This is the only *official* Riot source that
 * covers Wild Rift, but it provides metadata only — champion roster, titles,
 * roles, ability descriptions, and art. It does NOT expose per-level base stats
 * or item stat tables, so it enriches the scrape layer but never supplies the
 * numbers (those stay in the hand-verified overrides).
 *
 * Like every source here, it's consumed from a committed snapshot rather than a
 * live fetch (CI/cloud are network-allowlisted).
 */

const RiotRecordSchema = z.object({
  key: z.string(), // champion slug, joined against ry2x + overrides
  name: z.string(),
  title: z.string().default(""),
  roles: z.array(z.string()).default([]),
  image: z.string().optional(),
});

export const RiotSnapshotSchema = z.array(RiotRecordSchema);

/** Lighter than ChampionMeta — Riot only enriches a subset of fields. */
export interface RiotMeta {
  key: string;
  name: string;
  title: string;
  roles: string[];
  imageUrl?: string;
}

/** Parse and normalize a raw Riot Wild Rift website snapshot. */
export function parseRiot(raw: unknown): RiotMeta[] {
  return RiotSnapshotSchema.parse(raw).map((r) => ({
    key: r.key,
    name: r.name,
    title: r.title,
    roles: r.roles,
    imageUrl: r.image,
  }));
}
