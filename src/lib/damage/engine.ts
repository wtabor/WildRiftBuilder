import type { Ability, CombatMechanic, Item, StatBlock } from "@/lib/schema";
import { MAX_LEVEL } from "@/lib/stats/engine";

/**
 * Phase 3 (lolmath-tier damage modeling) lives here.
 *
 * This module is intentionally a thin stub for the MVP — but it is wired into
 * the schema (abilities + scalings are already captured in the data) so that
 * filling these functions in does not require touching the data model or the
 * stat engine. The MVP does not import this yet.
 */

/** Standard resistance damage-reduction multiplier. */
export function resistMultiplier(effectiveResist: number): number {
  if (effectiveResist >= 0) return 100 / (100 + effectiveResist);
  return 2 - 100 / (100 - effectiveResist);
}

export interface DamageContext {
  attacker: StatBlock;
  level: number;
  abilityRank: number; // 1..4
}

export interface TargetContext {
  armor: number;
  magicResist: number;
  maxHealth: number;
}

/**
 * Compute the pre-mitigation raw damage of a single ability cast.
 * TODO(Phase 3): resolve bonus-stat scalings, on-hit, and item passives.
 */
export function rawAbilityDamage(ability: Ability, ctx: DamageContext): number {
  const rankIndex = Math.max(0, Math.min(ctx.abilityRank - 1, ability.baseDamage.length - 1));
  let dmg = ability.baseDamage[rankIndex] ?? 0;
  for (const s of ability.scalings) {
    if (s.stat === "attackDamage") dmg += (ctx.attacker.attackDamage ?? 0) * s.ratio;
    else if (s.stat === "abilityPower") dmg += (ctx.attacker.abilityPower ?? 0) * s.ratio;
    else if (s.stat === "maxHealth") dmg += (ctx.attacker.maxHealth ?? 0) * s.ratio;
    // bonusAttackDamage / bonusHealth require base-stat separation — Phase 3.
  }
  return dmg;
}

/** Apply the appropriate resistance based on the ability's damage type. */
export function mitigatedAbilityDamage(
  ability: Ability,
  ctx: DamageContext,
  target: TargetContext,
): number {
  const raw = rawAbilityDamage(ability, ctx);
  switch (ability.damageType) {
    case "physical":
      return raw * resistMultiplier(target.armor);
    case "magic":
      return raw * resistMultiplier(target.magicResist);
    case "true":
      return raw;
    default:
      return 0;
  }
}

/* -------------------------------------------------------------------------- */
/*  Auto-attack DPS (Phase 3, pass 1)                                          */
/* -------------------------------------------------------------------------- */

/**
 * Global cap on item percent penetration. Mirrors Terminus' "Penetration Cap"
 * rule and is a sane ceiling regardless: total %armor/%magic pen from items
 * caps at 40%.
 */
export const PERCENT_PEN_CAP = 0.4;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Linear interpolation of a per-level value given as [atLevel1, atLevel15]. */
function lerpByLevel([lo, hi]: [number, number], level: number): number {
  const t = (clamp(level, 1, MAX_LEVEL) - 1) / (MAX_LEVEL - 1);
  return lo + (hi - lo) * t;
}

/** Effective resist after %-reduction (shred), %-pen, then flat pen, floored at 0. */
export function effectiveResist(
  base: number,
  { shredPercent = 0, pctPen = 0, flatPen = 0 }: { shredPercent?: number; pctPen?: number; flatPen?: number },
): number {
  const afterShred = base * (1 - shredPercent);
  const afterPct = afterShred * (1 - Math.min(pctPen, PERCENT_PEN_CAP));
  return Math.max(0, afterPct - flatPen);
}

export interface AutoAttackInput {
  /** Final, display-ready totals (champion + items), as from computeBuild. */
  stats: StatBlock;
  /** Final attack speed (attacks per second), already capped. */
  attackSpeed: number;
  level: number;
  items: Item[];
}

export interface AutoAttackDps {
  /** Sustained damage per second against the target. */
  dps: number;
  /** Average post-mitigation damage of a single basic attack. */
  perHit: number;
  attacksPerSecond: number;
  /** Post-mitigation per-hit damage split by type. */
  breakdown: { physical: number; magic: number; trueDamage: number };
  /** Effective resists after the attacker's shred + penetration. */
  effective: { armor: number; magicResist: number };
}

/** Pull every recognized combat mechanic off a build's items. */
function mechanicsOf(items: Item[]): CombatMechanic[] {
  const out: CombatMechanic[] = [];
  for (const it of items) for (const e of it.effects) if (e.mechanic) out.push(e.mechanic);
  return out;
}

/**
 * Sustained auto-attack DPS against a target, including crit, on-hit item
 * effects (Terminus, Kraken, Blade of the Ruined King, Wit's End, …), and the
 * attacker's penetration / armor shred.
 *
 * Modeling choices (documented because accuracy is the point):
 * - "Sustained" averages periodic procs (Kraken's every-3rd-hit) and crit over
 *   many attacks rather than simulating a specific attack sequence.
 * - On-hit damage does not itself crit.
 * - Percent-health on-hit (BotRK) is evaluated against the target's max health
 *   (a full-health target), which is the standard reference assumption.
 * - Melee values are used where an effect differs by range; ranged-specific
 *   numbers are a future refinement.
 */
export function autoAttackDps(input: AutoAttackInput, target: TargetContext): AutoAttackDps {
  const { stats, attackSpeed, level, items } = input;
  const mechanics = mechanicsOf(items);

  const ad = stats.attackDamage ?? 0;
  const rawCrit = stats.critChance ?? 0;
  const critChance = clamp(rawCrit, 0, 1);
  const excessCrit = Math.max(0, rawCrit - 1);

  // Crit damage: champion/item base (stat) + item crit modifiers + IE Limit Break.
  let critDamage = stats.critDamage ?? 0.75;
  let limitBreak = false;
  for (const m of mechanics) {
    if (m.kind === "crit") {
      if (m.critDamageBonus) critDamage += m.critDamageBonus;
      if (m.limitBreak) limitBreak = true;
    }
  }
  if (limitBreak && excessCrit > 0) critDamage += excessCrit * 0.6;

  // Average AD per hit accounting for crit frequency.
  const avgAttackAd = ad * (1 + critChance * critDamage);

  // On-hit damage by type (pre-mitigation), summed across items.
  let physOnHit = 0;
  let magicOnHit = 0;
  let trueOnHit = 0;
  for (const m of mechanics) {
    if (m.kind !== "onHit") continue;
    let amount = m.flat ?? 0;
    if (m.flatByLevel) amount += lerpByLevel(m.flatByLevel, level);
    if (m.currentHealthPct) amount += Math.max(m.min ?? 0, target.maxHealth * m.currentHealthPct);
    if (m.everyNth && m.everyNth > 1) amount /= m.everyNth; // amortize periodic procs
    if (m.damageType === "physical") physOnHit += amount;
    else if (m.damageType === "magic") magicOnHit += amount;
    else trueOnHit += amount;
  }

  // Attacker penetration / shred (from stats + mechanics).
  let lethality = stats.lethality ?? 0;
  let armorPctPen = stats.armorPenPercent ?? 0;
  let magicPctPen = stats.magicPenPercent ?? 0;
  const magicFlatPen = stats.magicPenFlat ?? 0;
  let armorShred = 0;
  for (const m of mechanics) {
    if (m.kind === "pen") {
      if (m.lethality) lethality += m.lethality;
      if (m.armorPenPercent) armorPctPen += m.armorPenPercent;
      if (m.magicPenPercent) magicPctPen += m.magicPenPercent;
    } else if (m.kind === "shred" && m.armorPercent) {
      armorShred += m.armorPercent;
    }
  }

  const armor = effectiveResist(target.armor, { shredPercent: armorShred, pctPen: armorPctPen, flatPen: lethality });
  const mr = effectiveResist(target.magicResist, { pctPen: magicPctPen, flatPen: magicFlatPen });

  const physical = (avgAttackAd + physOnHit) * resistMultiplier(armor);
  const magic = magicOnHit * resistMultiplier(mr);
  const trueDamage = trueOnHit;

  const perHit = physical + magic + trueDamage;
  return {
    dps: perHit * attackSpeed,
    perHit,
    attacksPerSecond: attackSpeed,
    breakdown: { physical, magic, trueDamage },
    effective: { armor, magicResist: mr },
  };
}
