import { z } from "zod";
import { StatBlockSchema, type StatBlock } from "./stats";

export * from "./stats";

/* -------------------------------------------------------------------------- */
/*  Items                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Item effects (passives/actives) are modeled as first-class data from day one.
 * The Phase-1 stat calculator does not yet *evaluate* them, but capturing them
 * in the schema now means Phase 3 (damage modeling) is additive, not a rewrite.
 */
/**
 * Phase-3 combat mechanics: a small, typed vocabulary describing the
 * auto-attack-relevant part of an item passive that the raw stat sheet can't
 * represent. Deliberately narrow — it models sustained DPS contributions
 * (on-hit damage, crit modifiers, penetration, resist shred), not full
 * ability combos. Anything an effect can't express here simply stays
 * descriptive text and is ignored by the engine.
 */
export const OnHitMechanicSchema = z.object({
  kind: z.literal("onHit"),
  damageType: z.enum(["physical", "magic", "true"]),
  /** Flat bonus damage every basic attack. */
  flat: z.number().optional(),
  /** Flat bonus that scales linearly from level 1 → 15: [atL1, atL15]. */
  flatByLevel: z.tuple([z.number(), z.number()]).optional(),
  /** Fraction of the target's (assumed-full) health dealt on-hit. */
  currentHealthPct: z.number().optional(),
  /** Floor for a percent-health hit. */
  min: z.number().optional(),
  /**
   * Periodic on-hit: the payload triggers once every `everyNth` attacks. The
   * engine amortizes it across hits for a sustained-DPS figure.
   */
  everyNth: z.number().int().positive().optional(),
});

export const CritMechanicSchema = z.object({
  kind: z.literal("crit"),
  /** Added to the crit multiplier bonus (IE: 205% vs 175% ⇒ +0.30). */
  critDamageBonus: z.number().optional(),
  /** IE "Limit Break": crit chance above 100% converts to crit damage. */
  limitBreak: z.boolean().optional(),
});

export const PenMechanicSchema = z.object({
  kind: z.literal("pen"),
  lethality: z.number().optional(),
  armorPenPercent: z.number().optional(),
  magicPenPercent: z.number().optional(),
});

/** Sustained armor reduction the attacker applies to the target (Black Cleaver). */
export const ShredMechanicSchema = z.object({
  kind: z.literal("shred"),
  armorPercent: z.number().optional(),
});

export const CombatMechanicSchema = z.discriminatedUnion("kind", [
  OnHitMechanicSchema,
  CritMechanicSchema,
  PenMechanicSchema,
  ShredMechanicSchema,
]);

export type CombatMechanic = z.infer<typeof CombatMechanicSchema>;

export const ItemEffectSchema = z.object({
  name: z.string(),
  kind: z.enum(["passive", "active"]),
  /** Free-text description shown in tooltips today. */
  description: z.string(),
  /**
   * Optional machine-readable hook for the damage engine. When present and
   * recognized, the Phase-3 auto-attack model evaluates it; otherwise the
   * effect remains purely descriptive.
   */
  mechanic: CombatMechanicSchema.optional(),
});

/**
 * Per-value provenance: a sparse map from a displayed value's key (a StatKey,
 * `"cost"`, or a champion ability/stat key) to the patch version in which that
 * value last changed. Sparse on purpose — anything absent defaults to the
 * dataset's baseline patch, so a new patch only stamps the values it touched.
 */
export const ProvenanceSchema = z.record(z.string(), z.string());

export type Provenance = z.infer<typeof ProvenanceSchema>;

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.number().int().nonnegative(),
  /** Total gold value if built from components; used for gold efficiency. */
  totalCost: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).default([]),
  /** "boots" or "item" — drives which build slot it occupies. Patch 7.2 removed
   * the boot-enchantment mechanic; former enchants are now ordinary items.
   * "enchant" is kept only so the frozen pre-7.2 patch snapshots stay
   * schema-valid — no patch from 7.2 onward should use it. */
  slot: z.enum(["item", "boots", "enchant"]).default("item"),
  stats: StatBlockSchema.default({}),
  effects: z.array(ItemEffectSchema).default([]),
  icon: z.string().optional(),
  /** Sparse "value key → patch it last changed in" map; see ProvenanceSchema. */
  provenance: ProvenanceSchema.optional(),
});

export type Item = z.infer<typeof ItemSchema>;
export type ItemEffect = z.infer<typeof ItemEffectSchema>;

/* -------------------------------------------------------------------------- */
/*  Champions                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Ability data is captured now (for the Phase 3 damage engine) but unused by the
 * MVP stat panel. Scalings are stored as ratios against a stat (e.g. 0.6 AP).
 */
export const AbilityScalingSchema = z.object({
  stat: z.enum(["attackDamage", "bonusAttackDamage", "abilityPower", "maxHealth", "bonusHealth"]),
  ratio: z.number(),
});

export const AbilitySchema = z.object({
  slot: z.enum(["passive", "Q", "W", "E", "R"]),
  name: z.string(),
  description: z.string().default(""),
  /** Base damage per rank, e.g. [60, 110, 160, 210]. */
  baseDamage: z.array(z.number()).default([]),
  damageType: z.enum(["physical", "magic", "true", "none"]).default("none"),
  scalings: z.array(AbilityScalingSchema).default([]),
  cooldown: z.array(z.number()).default([]),
});

export type Ability = z.infer<typeof AbilitySchema>;

/**
 * Champion stats are modeled as base (level 1) + linear per-level growth.
 *
 * NOTE: Wild Rift growth is approximately linear per level. The exact in-game
 * formula must be confirmed during the data hand-verify pass; the engine
 * isolates growth into a single function (see lib/stats) so it can be swapped
 * without touching the data shape.
 */
export const GrowthStatSchema = z.object({
  base: z.number(),
  perLevel: z.number().default(0),
});

export const ChampionSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().default(""),
  roles: z.array(z.string()).default([]),
  resourceType: z.enum(["mana", "energy", "none"]).default("mana"),
  stats: z.object({
    attackDamage: GrowthStatSchema,
    abilityPower: GrowthStatSchema.optional(),
    attackSpeed: GrowthStatSchema, // base = base AS (e.g. 0.65), perLevel = AS growth ratio
    armor: GrowthStatSchema,
    magicResist: GrowthStatSchema,
    maxHealth: GrowthStatSchema,
    healthRegen: GrowthStatSchema,
    mana: GrowthStatSchema,
    manaRegen: GrowthStatSchema,
    moveSpeed: z.number(), // flat, no growth
    critDamageBase: z.number().default(0.75), // bonus over 1.0 (1.75x total)
  }),
  abilities: z.array(AbilitySchema).default([]),
  icon: z.string().optional(),
  /** Sparse "value key → patch it last changed in" map; see ProvenanceSchema. */
  provenance: ProvenanceSchema.optional(),
});

export type Champion = z.infer<typeof ChampionSchema>;

/* -------------------------------------------------------------------------- */
/*  Build presets — curated "standing builds" per champion                     */
/* -------------------------------------------------------------------------- */

/**
 * A curated, one-click-loadable build for a champion (a "standing build").
 * Item/boots references are patch-local ids; the validator enforces that they
 * exist and sit in the right slot, so a preset can never point at a missing
 * or mis-slotted item.
 */
export const BuildPresetSchema = z.object({
  id: z.string(),
  championId: z.string(),
  name: z.string(),
  archetype: z.enum(["crit", "on-hit", "ability", "lethality", "bruiser", "tank", "meme"]),
  description: z.string().default(""),
  /** Ordered core items for the 6 main slots (excludes boots). */
  items: z.array(z.string()).max(6).default([]),
  boots: z.string().optional(),
  /** Level to preview the build at when it's loaded. */
  level: z.number().int().min(1).max(15).default(15),
  /** Source URL the build was verified against. Omit for editorial/meme builds. */
  source: z.string().url().optional(),
  /** Editorial off-meta "for fun" build — not claimed as competitive. */
  meme: z.boolean().default(false),
});

export type BuildPreset = z.infer<typeof BuildPresetSchema>;

export const BuildsFileSchema = z.array(BuildPresetSchema);

/* -------------------------------------------------------------------------- */
/*  Patch dataset                                                              */
/* -------------------------------------------------------------------------- */

export const PatchMetaSchema = z.object({
  patch: z.string(),
  releaseDate: z.string(),
  /** Where each slice of data came from / was verified — provenance for trust. */
  sources: z.array(z.string()).default([]),
  verified: z.boolean().default(false),
});

export type PatchMeta = z.infer<typeof PatchMetaSchema>;

export const ChampionsFileSchema = z.array(ChampionSchema);
export const ItemsFileSchema = z.array(ItemSchema);

export type { StatBlock };
