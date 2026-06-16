import { z } from "zod";
import {
  ChampionSchema,
  GrowthStatSchema,
  AbilitySchema,
  type Champion,
} from "../../src/lib/schema/index";
import type { ChampionMeta } from "./adapters/ry2x";
import type { RiotMeta } from "./adapters/riot";

/**
 * Enrich the canonical metadata (ry2x: roster + Wild Rift availability) with the
 * official Riot source (titles, roles, art). ry2x remains the source of truth for
 * which champions exist and whether they're in Wild Rift; Riot wins on the fields
 * it provides. Riot-only champions are ignored — availability must come from ry2x.
 */
export function enrichWithRiot(
  base: ChampionMeta[],
  riot: RiotMeta[],
): ChampionMeta[] {
  const riotByKey = new Map(riot.map((r) => [r.key, r]));
  return base.map((m) => {
    const r = riotByKey.get(m.key);
    if (!r) return m;
    return {
      ...m,
      title: r.title || m.title,
      roles: r.roles.length ? r.roles : m.roles,
      imageUrl: r.imageUrl ?? m.imageUrl,
    };
  });
}

/**
 * Shape of one entry in data/overrides/champions.json — the hand-verified layer.
 * Mirrors the stats/abilities portion of ChampionSchema plus a verification flag.
 */
export const ChampionOverrideSchema = z.object({
  verified: z.boolean().default(false),
  resourceType: z.enum(["mana", "energy", "none"]).default("mana"),
  stats: z.object({
    attackDamage: GrowthStatSchema,
    abilityPower: GrowthStatSchema.optional(),
    attackSpeed: GrowthStatSchema,
    armor: GrowthStatSchema,
    magicResist: GrowthStatSchema,
    maxHealth: GrowthStatSchema,
    healthRegen: GrowthStatSchema,
    mana: GrowthStatSchema,
    manaRegen: GrowthStatSchema,
    moveSpeed: z.number(),
    critDamageBase: z.number().default(0.75),
  }),
  abilities: z.array(AbilitySchema).default([]),
});

export type ChampionOverride = z.infer<typeof ChampionOverrideSchema>;

/** Parse the raw overrides file (ignoring any leading `_comment` keys). */
export function parseOverrides(raw: unknown): Record<string, ChampionOverride> {
  const obj = z.record(z.string(), z.unknown()).parse(raw);
  const out: Record<string, ChampionOverride> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("_")) continue; // skip documentation keys
    out[key] = ChampionOverrideSchema.parse(value);
  }
  return out;
}

export interface MergeReport {
  emitted: string[];
  /** In Wild Rift but missing a hand-verified override → not shipped. */
  missingOverride: string[];
  /** Not available in Wild Rift → intentionally skipped. */
  notInWildRift: string[];
  /** Emitted but not yet verified against in-game values. */
  unverified: string[];
}

export interface MergeResult {
  champions: Champion[];
  report: MergeReport;
}

/**
 * Combine scraped metadata with the hand-verified overrides into the final,
 * schema-valid champion list. A champion ships only when it is available in
 * Wild Rift AND has an override (so we never publish placeholder numbers).
 */
export function mergeChampions(
  meta: ChampionMeta[],
  overrides: Record<string, ChampionOverride>,
): MergeResult {
  const champions: Champion[] = [];
  const report: MergeReport = {
    emitted: [],
    missingOverride: [],
    notInWildRift: [],
    unverified: [],
  };

  for (const m of meta) {
    if (!m.availableInWildRift) {
      report.notInWildRift.push(m.key);
      continue;
    }
    const ov = overrides[m.key];
    if (!ov) {
      report.missingOverride.push(m.key);
      continue;
    }
    const champion = ChampionSchema.parse({
      id: m.key,
      name: m.name,
      title: m.title,
      roles: m.roles,
      resourceType: ov.resourceType,
      stats: ov.stats,
      abilities: ov.abilities,
      ...(m.imageUrl ? { icon: m.imageUrl } : {}),
    });
    champions.push(champion);
    report.emitted.push(m.key);
    if (!ov.verified) report.unverified.push(m.key);
  }

  champions.sort((a, b) => a.name.localeCompare(b.name));
  return { champions, report };
}
