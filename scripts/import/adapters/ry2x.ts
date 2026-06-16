import { z } from "zod";

/**
 * Adapter for the ry2x "WildRift-Merged-Champion-Data" source.
 *
 * Parses a raw source snapshot into normalized champion *metadata*. It does NOT
 * produce stats or abilities — those come from the hand-verified overrides layer
 * (data/overrides/champions.json). Keeping the adapter pure (raw -> meta) makes
 * it unit-testable and swappable if the upstream shape changes.
 */

const Ry2xRecordSchema = z.object({
  key: z.string(), // our champion slug, e.g. "ahri"
  hero_id: z.number().int(),
  name: z.string(),
  title: z.string().default(""),
  classes: z.array(z.string()).default([]),
  lanes: z.array(z.string()).default([]),
  is_wr: z.boolean(),
  ratings: z
    .object({
      difficulty: z.number(),
      damage: z.number(),
      survive: z.number(),
      utility: z.number(),
    })
    .partial()
    .optional(),
});

export const Ry2xSnapshotSchema = z.array(Ry2xRecordSchema);
export type Ry2xRecord = z.infer<typeof Ry2xRecordSchema>;

export interface ChampionMeta {
  /** Champion slug, used as the id and to join with overrides. */
  key: string;
  sourceId: number;
  name: string;
  title: string;
  roles: string[];
  lanes: string[];
  availableInWildRift: boolean;
}

const CLASS_LABELS: Record<string, string> = {
  marksman: "Marksman",
  mage: "Mage",
  assassin: "Assassin",
  fighter: "Fighter",
  tank: "Tank",
  support: "Support",
};

function toRole(cls: string): string {
  return CLASS_LABELS[cls.toLowerCase()] ?? cls;
}

/** Parse and normalize a raw ry2x snapshot into champion metadata. */
export function parseRy2x(raw: unknown): ChampionMeta[] {
  const records = Ry2xSnapshotSchema.parse(raw);
  return records.map((r) => ({
    key: r.key,
    sourceId: r.hero_id,
    name: r.name,
    title: r.title,
    roles: r.classes.map(toRole),
    lanes: r.lanes,
    availableInWildRift: r.is_wr,
  }));
}
