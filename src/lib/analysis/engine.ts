import { STAT_KEYS, type Champion, type Item } from "@/lib/schema";
import {
  computeBuild,
  goldEfficiency,
  BASE_ATTACK_SPEED_CAP,
  GOLD_VALUES,
} from "@/lib/stats/engine";
import { autoAttackDps, type TargetContext } from "@/lib/damage/engine";

/**
 * Rule-based build analysis. Every finding is derived from the same pure
 * engines that power the stat sheet — nothing here guesses, calls a model, or
 * invents a number, so the analysis inherits the dataset's accuracy guarantees.
 *
 * Scope (v1, deliberately narrow so every claim is defensible):
 * - wasted stats the engine can prove (crit past 100%, attack speed past cap,
 *   mana on manaless champions)
 * - structural gaps (no boots, no defensive stats in a full build)
 * - raw-stat gold efficiency (explicitly caveated: passives aren't priced)
 * - build-vs-champion damage identity mismatch (from ability scalings)
 * - a single best auto-attack DPS item swap, skipped for ability-scaling
 *   champions because the damage engine models autos only
 */

export type FindingSeverity = "warn" | "info" | "good";

export interface Finding {
  id: string;
  severity: FindingSeverity;
  title: string;
  detail: string;
}

export type DamageIdentity = "physical" | "magic" | "mixed";

export interface BuildInput {
  /** Core items (the 6 main slots). */
  items: Item[];
  boots: Item | null;
}

export interface BuildAnalysis {
  identity: DamageIdentity;
  findings: Finding[];
}

export interface SwapSuggestion {
  outId: string;
  outName: string;
  inId: string;
  inName: string;
  /** Sustained auto DPS gained by the swap. */
  dpsDelta: number;
  /** Extra gold the swap costs (negative = cheaper). */
  goldDelta: number;
}

export interface CompareVerdict {
  dpsA: number;
  dpsB: number;
  goldA: number;
  goldB: number;
  /** B minus A, from the computed totals. */
  armorDelta: number;
  magicResistDelta: number;
  maxHealthDelta: number;
}

const allItemsOf = (b: BuildInput): Item[] =>
  b.boots ? [...b.items, b.boots] : [...b.items];

/**
 * Which stat a champion's kit actually scales with, read from the structured
 * ability scalings. Falls back to ability damage types when no scalings are
 * recorded. "mixed" means neither side clearly dominates.
 */
export function damageIdentity(champ: Champion): DamageIdentity {
  let ad = 0;
  let ap = 0;
  for (const a of champ.abilities) {
    for (const s of a.scalings) {
      if (s.stat === "abilityPower") ap += s.ratio;
      else if (s.stat === "attackDamage" || s.stat === "bonusAttackDamage") ad += s.ratio;
    }
  }
  if (ad === 0 && ap === 0) {
    let phys = 0;
    let magic = 0;
    for (const a of champ.abilities) {
      if (a.damageType === "physical") phys += 1;
      else if (a.damageType === "magic") magic += 1;
    }
    if (magic > phys) return "magic";
    if (phys > magic) return "physical";
    return "mixed";
  }
  if (ap >= ad * 1.5) return "magic";
  if (ad >= ap * 1.5) return "physical";
  return "mixed";
}

export function analyzeBuild(champ: Champion, level: number, build: BuildInput): BuildAnalysis {
  const identity = damageIdentity(champ);
  const all = allItemsOf(build);
  const findings: Finding[] = [];
  if (all.length === 0) return { identity, findings };

  const totals = computeBuild(champ, level, all);

  // Crit past 100% is wasted — unless an item converts the excess (IE's
  // Limit Break), which the mechanic data tells us directly.
  const crit = totals.stats.critChance ?? 0;
  if (crit > 1.001) {
    const limitBreak = all.some((it) =>
      it.effects.some((e) => e.mechanic?.kind === "crit" && e.mechanic.limitBreak),
    );
    const over = Math.round((crit - 1) * 100);
    findings.push(
      limitBreak
        ? {
            id: "crit-overcap",
            severity: "info",
            title: `Crit chance is ${over}% over the 100% cap`,
            detail: "Limit Break converts the excess to crit damage, so it isn't wasted.",
          }
        : {
            id: "crit-overcap",
            severity: "warn",
            title: `${over}% crit chance is wasted`,
            detail: "Crit chance caps at 100%. Swap a crit item for raw damage or survivability.",
          },
    );
  }

  // Attack speed past the 2.5 cap is thrown away.
  const uncappedAS = champ.stats.attackSpeed.base * (1 + (totals.stats.attackSpeed ?? 0));
  if (uncappedAS > BASE_ATTACK_SPEED_CAP + 0.005) {
    findings.push({
      id: "as-overcap",
      severity: "warn",
      title: `${(uncappedAS - BASE_ATTACK_SPEED_CAP).toFixed(2)} attacks/sec over the ${BASE_ATTACK_SPEED_CAP} cap`,
      detail: "Attack speed past the cap does nothing — trade some for damage or defense.",
    });
  }

  // Mana items on a champion that doesn't use mana.
  if (champ.resourceType !== "mana") {
    const manaItems = all.filter((it) => (it.stats.mana ?? 0) > 0 || (it.stats.manaRegen ?? 0) > 0);
    if (manaItems.length > 0) {
      findings.push({
        id: "mana-waste",
        severity: "warn",
        title: `${champ.name} doesn't use mana`,
        detail: `${manaItems.map((i) => i.name).join(", ")} grant${manaItems.length === 1 ? "s" : ""} mana that does nothing here.`,
      });
    }
  }

  // Build-vs-kit damage identity mismatch, from the ability scaling data.
  const itemAd = all.reduce((n, it) => n + (it.stats.attackDamage ?? 0), 0);
  const itemAp = all.reduce((n, it) => n + (it.stats.abilityPower ?? 0), 0);
  if (identity === "magic" && itemAd >= 40 && itemAd > itemAp) {
    findings.push({
      id: "identity-mismatch",
      severity: "warn",
      title: "AD items on an AP-scaling kit",
      detail: `${champ.name}'s abilities scale with Ability Power, but this build carries more Attack Damage than AP.`,
    });
  } else if (identity === "physical" && itemAp >= 40 && itemAp > itemAd) {
    findings.push({
      id: "identity-mismatch",
      severity: "warn",
      title: "AP items on an AD-scaling kit",
      detail: `${champ.name}'s abilities scale with Attack Damage, but this build carries more Ability Power than AD.`,
    });
  }

  // Structural gaps.
  if (build.items.length >= 3 && !build.boots) {
    findings.push({
      id: "no-boots",
      severity: "info",
      title: "No boots",
      detail: "Boots have a dedicated slot — skipping them gives up cheap move speed.",
    });
  }
  if (all.length >= 4) {
    const defense = all.reduce(
      (n, it) => n + (it.stats.armor ?? 0) + (it.stats.magicResist ?? 0) + (it.stats.maxHealth ?? 0),
      0,
    );
    if (defense === 0) {
      findings.push({
        id: "glass-cannon",
        severity: "info",
        title: "Full glass cannon",
        detail: "No armor, magic resist, or health from any item — one defensive piece goes a long way.",
      });
    }
  }

  // Raw-stat gold efficiency. Passives/actives aren't priced, so this is
  // informational, never a hard "bad item" claim. Items carrying any stat
  // GOLD_VALUES can't price (e.g. %armor pen, omnivamp) are skipped outright —
  // "low value" would be a false claim when part of the value is uncounted.
  const fullyPriced = (it: Item) =>
    STAT_KEYS.every((k) => !it.stats[k] || GOLD_VALUES[k] !== undefined);
  const inefficient = all
    .map((it) => ({ it, eff: goldEfficiency(it) }))
    .filter((x): x is { it: Item; eff: number } => x.eff !== null && x.eff < 0.7 && fullyPriced(x.it));
  if (inefficient.length > 0) {
    findings.push({
      id: "gold-inefficient",
      severity: "info",
      title: `Low raw-stat value: ${inefficient.map((x) => `${x.it.name} (${Math.round(x.eff * 100)}%)`).join(", ")}`,
      detail: "Raw stats vs cost only — passives and actives aren't priced in, so a strong effect can justify this.",
    });
  }

  if (!findings.some((f) => f.severity === "warn")) {
    findings.unshift({
      id: "clean",
      severity: "good",
      title: "No wasted stats detected",
      detail: "Nothing over a cap, no dead stats, no kit mismatch the engine can prove.",
    });
  }

  return { identity, findings };
}

/**
 * Best single-item swap by sustained auto-attack DPS, searched over the whole
 * catalog. Returns null for AP-scaling champions: the damage engine models
 * autos only, so pushing AD items onto a mage would be misleading, not helpful.
 * Mixed-identity champions do get suggestions — they auto-attack enough that
 * the figure is real, but the UI caveats that abilities aren't modeled.
 */
export function suggestSwap(
  champ: Champion,
  level: number,
  build: BuildInput,
  target: TargetContext,
  catalog: Item[],
): SwapSuggestion | null {
  if (build.items.length === 0 || damageIdentity(champ) === "magic") return null;

  const all = allItemsOf(build);
  const base = computeBuild(champ, level, all);
  const baseline = autoAttackDps(
    { stats: base.stats, attackSpeed: base.attackSpeed, level, items: all },
    target,
  ).dps;

  const owned = new Set(all.map((it) => it.id));
  let best: SwapSuggestion | null = null;

  for (let i = 0; i < build.items.length; i++) {
    const out = build.items[i];
    for (const candidate of catalog) {
      if (candidate.slot !== "item" || owned.has(candidate.id)) continue;
      const items = [...build.items.slice(0, i), candidate, ...build.items.slice(i + 1)];
      const withBoots = build.boots ? [...items, build.boots] : items;
      const totals = computeBuild(champ, level, withBoots);
      const dps = autoAttackDps(
        { stats: totals.stats, attackSpeed: totals.attackSpeed, level, items: withBoots },
        target,
      ).dps;
      const dpsDelta = dps - baseline;
      if (dpsDelta > Math.max(1, baseline * 0.01) && (!best || dpsDelta > best.dpsDelta)) {
        best = {
          outId: out.id,
          outName: out.name,
          inId: candidate.id,
          inName: candidate.name,
          dpsDelta,
          goldDelta: candidate.cost - out.cost,
        };
      }
    }
  }
  return best;
}

/** A-vs-B deltas for the compare verdict; presentation decides the wording. */
export function compareBuilds(
  champ: Champion,
  level: number,
  a: BuildInput,
  b: BuildInput,
  target: TargetContext,
): CompareVerdict {
  const allA = allItemsOf(a);
  const allB = allItemsOf(b);
  const tA = computeBuild(champ, level, allA);
  const tB = computeBuild(champ, level, allB);
  const dpsA = autoAttackDps({ stats: tA.stats, attackSpeed: tA.attackSpeed, level, items: allA }, target).dps;
  const dpsB = autoAttackDps({ stats: tB.stats, attackSpeed: tB.attackSpeed, level, items: allB }, target).dps;
  return {
    dpsA,
    dpsB,
    goldA: tA.goldCost,
    goldB: tB.goldCost,
    armorDelta: (tB.stats.armor ?? 0) - (tA.stats.armor ?? 0),
    magicResistDelta: (tB.stats.magicResist ?? 0) - (tA.stats.magicResist ?? 0),
    maxHealthDelta: (tB.stats.maxHealth ?? 0) - (tA.stats.maxHealth ?? 0),
  };
}
