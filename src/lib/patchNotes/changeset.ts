// zod/v4 (ships inside zod 3.25) so the schema is compatible with the Anthropic
// SDK's structured-output helper, which types against zod/v4.
import * as z from "zod/v4";

/**
 * A changeset is the structured form of a patch note: a list of numeric edits to
 * the hand-verified overrides layer. The LLM extractor (extract.ts) produces one
 * of these from patch-note prose; `applyChangeset` applies it deterministically.
 *
 * Numbers from patch notes are never trusted blindly — a changeset is always
 * applied on a branch and opened as a review PR, never merged automatically.
 */

export const ChampionStatOpSchema = z.object({
  kind: z.literal("champion-stat"),
  championId: z.string(),
  /** Dotted path into the override stats, e.g. "attackDamage.base" or "moveSpeed". */
  path: z.string(),
  to: z.number(),
  /** Optional prior value the model read from the notes, for the PR summary. */
  from: z.number().optional(),
  note: z.string().optional(),
});

export const ItemStatOpSchema = z.object({
  kind: z.literal("item-stat"),
  itemId: z.string(),
  /** A stat key (e.g. "attackDamage") or "cost". */
  field: z.string(),
  to: z.number(),
  from: z.number().optional(),
  note: z.string().optional(),
});

export const ChangeOpSchema = z.discriminatedUnion("kind", [
  ChampionStatOpSchema,
  ItemStatOpSchema,
]);

export const ChangesetSchema = z.object({
  patch: z.string(),
  summary: z.string(),
  ops: z.array(ChangeOpSchema),
});

export type ChangeOp = z.infer<typeof ChangeOpSchema>;
export type Changeset = z.infer<typeof ChangesetSchema>;

export interface ApplyResult {
  champions: Record<string, unknown>;
  items: unknown[];
  applied: string[];
  /** Ops that referenced an unknown champion/item/path — surfaced for review. */
  skipped: string[];
}

function setPath(obj: Record<string, unknown>, path: string, value: number): boolean {
  const parts = path.split(".");
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]];
    if (typeof next !== "object" || next === null) return false;
    cur = next as Record<string, unknown>;
  }
  const leaf = parts[parts.length - 1];
  if (!(leaf in cur)) return false;
  cur[leaf] = value;
  return true;
}

/**
 * Apply a changeset to deep copies of the overrides champions map and items
 * array. Pure: inputs are not mutated. Unmatched ops are reported, not thrown,
 * so a partially-correct extraction still produces a reviewable PR.
 */
export function applyChangeset(
  championsOverrides: Record<string, unknown>,
  itemsOverrides: unknown[],
  changeset: Changeset,
): ApplyResult {
  const champions = structuredClone(championsOverrides);
  const items = structuredClone(itemsOverrides) as Array<Record<string, unknown>>;
  const applied: string[] = [];
  const skipped: string[] = [];

  for (const op of changeset.ops) {
    if (op.kind === "champion-stat") {
      const champ = champions[op.championId] as Record<string, unknown> | undefined;
      const stats = champ?.stats as Record<string, unknown> | undefined;
      if (!champ || !stats || !setPath(stats, op.path, op.to)) {
        skipped.push(`champion ${op.championId} ${op.path} (not found)`);
        continue;
      }
      // Stamp provenance under the top-level stat key (e.g. "attackDamage.base" → "attackDamage").
      const prov = (champ.provenance ??= {}) as Record<string, string>;
      prov[op.path.split(".")[0]] = changeset.patch;
      applied.push(`${op.championId}.${op.path} → ${op.to}`);
    } else {
      const item = items.find((i) => i.id === op.itemId);
      if (!item) {
        skipped.push(`item ${op.itemId} (not found)`);
        continue;
      }
      if (op.field === "cost") {
        item.cost = op.to;
      } else {
        const stats = (item.stats ??= {}) as Record<string, unknown>;
        stats[op.field] = op.to;
      }
      const prov = (item.provenance ??= {}) as Record<string, string>;
      prov[op.field] = changeset.patch;
      applied.push(`${op.itemId}.${op.field} → ${op.to}`);
    }
  }

  return { champions, items, applied, skipped };
}
