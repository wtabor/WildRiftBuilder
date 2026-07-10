import Anthropic from "@anthropic-ai/sdk";
import { getChampion, getItem } from "@/lib/data";
import { computeBuild } from "@/lib/stats/engine";
import { autoAttackDps } from "@/lib/damage/engine";
import { itemStatLines } from "@/lib/statDisplay";
import { formatGold } from "@/lib/format";
import { DEFAULT_TARGET, type TargetStats } from "@/state/buildState";

export const runtime = "nodejs";

interface RequestBody {
  championId?: string;
  level?: number;
  itemAId?: string;
  itemBId?: string;
  target?: Partial<TargetStats>;
}

/** One item's isolated impact on the champion — the only numbers the model may cite. */
function buildGrounding(championId: string, level: number, itemId: string, target: TargetStats) {
  const champion = getChampion(championId)!;
  const item = getItem(itemId)!;
  const totals = computeBuild(champion, level, [item]);
  const dps = autoAttackDps({ stats: totals.stats, attackSpeed: totals.attackSpeed, level, items: [item] }, target);
  return {
    item: {
      name: item.name,
      cost: formatGold(item.cost),
      stats: itemStatLines(item).map((l) => `${l.label}: +${l.display}`),
      effects: item.effects.map((e) => `${e.name} (${e.kind}): ${e.description}`),
    },
    withChampion: {
      finalAttackSpeed: totals.attackSpeed.toFixed(2),
      autoAttackDps: Math.round(dps.dps),
      goldCost: formatGold(totals.goldCost),
    },
  };
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "AI summary is not configured on this server (missing ANTHROPIC_API_KEY)." },
      { status: 501 },
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { championId, itemAId, itemBId } = body;
  const level = Math.max(1, Math.min(15, Number(body.level) || 15));
  if (!championId || !itemAId || !itemBId) {
    return Response.json({ error: "championId, itemAId, and itemBId are required." }, { status: 400 });
  }

  const champion = getChampion(championId);
  const itemA = getItem(itemAId);
  const itemB = getItem(itemBId);
  if (!champion || !itemA || !itemB) {
    return Response.json({ error: "Unknown championId, itemAId, or itemBId." }, { status: 404 });
  }

  const target: TargetStats = {
    armor: body.target?.armor ?? DEFAULT_TARGET.armor,
    magicResist: body.target?.magicResist ?? DEFAULT_TARGET.magicResist,
    maxHealth: body.target?.maxHealth ?? DEFAULT_TARGET.maxHealth,
  };

  const grounding = {
    champion: {
      name: champion.name,
      title: champion.title,
      roles: champion.roles,
      resourceType: champion.resourceType,
      level,
      passive: champion.abilities.find((a) => a.slot === "passive")?.description || undefined,
    },
    itemA: buildGrounding(championId, level, itemAId, target),
    itemB: buildGrounding(championId, level, itemBId, target),
    targetDummy: target,
  };

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 500,
      system:
        "You are a Wild Rift build analyst embedded in a stat calculator. You are given precomputed, verified " +
        "numbers for how two items affect one champion (attack speed, auto-attack DPS vs a target dummy, gold " +
        "cost, and each item's raw stats/effects) plus the champion's passive text for qualitative context. " +
        "Write a short verdict (3-5 sentences) on which item is better for this champion and why. " +
        "Cite the specific numbers you were given when they support your point. Do not invent, estimate, or " +
        "recall any stat, cost, or ability value that was not provided to you — if something isn't in the data, " +
        "don't state it as fact. End with one bolded line: **Verdict: <Item name>**.",
      messages: [{ role: "user", content: JSON.stringify(grounding, null, 2) }],
    });

    const summary = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    return Response.json({ summary, grounding });
  } catch (err) {
    console.error("compare-items: Anthropic request failed", err);
    return Response.json({ error: "AI summary request failed. Try again in a moment." }, { status: 502 });
  }
}
