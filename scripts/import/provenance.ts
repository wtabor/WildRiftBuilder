import type { Item, Provenance } from "../../src/lib/schema/index";

/**
 * Provenance fill: every displayed value gets a "last changed in patch X" stamp.
 * Overrides carry sparse provenance (only values changed after the baseline);
 * the pipeline expands it to a complete map keyed the same way the UI renders
 * values (stat keys / "cost" / ability slots), defaulting to the baseline patch.
 */

/** Champion stat-group name → the StatKey the UI uses (only moveSpeed differs). */
const CHAMPION_STAT_TO_KEY: Record<string, string> = {
  attackDamage: "attackDamage",
  abilityPower: "abilityPower",
  attackSpeed: "attackSpeed",
  armor: "armor",
  magicResist: "magicResist",
  maxHealth: "maxHealth",
  healthRegen: "healthRegen",
  mana: "mana",
  manaRegen: "manaRegen",
  moveSpeed: "moveSpeedFlat",
};

export function fillItemProvenance(item: Item, baseline: string): Provenance {
  const sparse = item.provenance ?? {};
  const out: Provenance = {};
  for (const key of Object.keys(item.stats)) {
    if (item.stats[key as keyof typeof item.stats]) out[key] = sparse[key] ?? baseline;
  }
  out.cost = sparse.cost ?? baseline;
  return out;
}

export function fillChampionProvenance(
  stats: Record<string, unknown>,
  abilities: Array<{ slot: string }>,
  sparse: Provenance,
  baseline: string,
): Provenance {
  const out: Provenance = {};
  for (const [statName, uiKey] of Object.entries(CHAMPION_STAT_TO_KEY)) {
    if (stats[statName] !== undefined) out[uiKey] = sparse[uiKey] ?? sparse[statName] ?? baseline;
  }
  for (const ability of abilities) {
    out[ability.slot] = sparse[ability.slot] ?? baseline;
  }
  return out;
}
