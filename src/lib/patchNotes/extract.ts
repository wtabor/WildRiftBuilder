import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ChangesetSchema, type Changeset } from "./changeset";

/**
 * Turn patch-note prose into a structured changeset against our dataset, using
 * Claude with a constrained JSON schema. Runtime-only: requires ANTHROPIC_API_KEY
 * and outbound network, so it runs in the Vercel cron route, not in CI.
 *
 * The output is intentionally treated as a *proposal*: the cron opens a review PR
 * rather than committing the numbers, because patch-note prose is ambiguous and
 * the model can misread it.
 */

export interface DatasetContext {
  patch: string;
  /** Champion ids with their current numeric stats, for grounding the edits. */
  champions: Record<string, unknown>;
  /** Items with ids, costs, and stats. */
  items: unknown[];
}

const SYSTEM = `You convert League of Legends: Wild Rift patch notes into a precise list of numeric data edits.
You are given the patch-note text and the project's CURRENT champion/item data (ids and numbers).
Rules:
- Only emit an edit when the notes state a concrete new numeric value (or an unambiguous delta you can resolve against the current value).
- Use the exact champion/item ids and stat paths from the provided data. Champion stat paths are dotted, e.g. "attackDamage.base", "armor.perLevel", "moveSpeed". Item fields are a stat key (e.g. "attackDamage") or "cost".
- Skip qualitative changes, ability reworks, and anything you cannot map to a concrete number on an existing id.
- Prefer correctness over completeness: omit anything uncertain.`;

export async function extractChangeset(
  articleText: string,
  ctx: DatasetContext,
  client: Anthropic = new Anthropic(),
): Promise<Changeset> {
  const userContent = [
    `Patch: ${ctx.patch}`,
    "",
    "CURRENT CHAMPION DATA (id → stats):",
    JSON.stringify(ctx.champions),
    "",
    "CURRENT ITEM DATA (id, cost, stats):",
    JSON.stringify(ctx.items),
    "",
    "PATCH NOTES:",
    articleText,
  ].join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: userContent }],
    output_config: { format: zodOutputFormat(ChangesetSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    throw new Error("Model did not return a parseable changeset");
  }
  return parsed;
}
