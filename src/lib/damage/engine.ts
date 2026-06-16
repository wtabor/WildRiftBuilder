import type { Ability, StatBlock } from "@/lib/schema";

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
