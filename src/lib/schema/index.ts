import { z } from "zod";
import { StatBlockSchema, type StatBlock } from "./stats";

export * from "./stats";

/* -------------------------------------------------------------------------- */
/*  Provenance — which patch each value last changed in                        */
/* -------------------------------------------------------------------------- */

/**
 * Maps a value key (a stat key, "cost", or an ability slot) to the patch version
 * that value was last changed in, e.g. { "attackDamage": "7.1g" }. The UI resolves
 * the version to a date + patch-notes URL via the patch registry.
 */
export const ProvenanceSchema = z.record(z.string(), z.string());
export type Provenance = z.infer<typeof ProvenanceSchema>;

/** Registry of patch versions → release date + patch-notes URL. */
export const PatchRegistryEntrySchema = z.object({
  date: z.string().optional(),
  url: z.string().optional(),
});
export const PatchRegistrySchema = z.record(z.string(), PatchRegistryEntrySchema);
export type PatchRegistry = z.infer<typeof PatchRegistrySchema>;
export type PatchRegistryEntry = z.infer<typeof PatchRegistryEntrySchema>;

/* -------------------------------------------------------------------------- */
/*  Items                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Item effects (passives/actives) are modeled as first-class data from day one.
 * The Phase-1 stat calculator does not yet *evaluate* them, but capturing them
 * in the schema now means Phase 3 (damage modeling) is additive, not a rewrite.
 */
export const ItemEffectSchema = z.object({
  name: z.string(),
  kind: z.enum(["passive", "active"]),
  /** Free-text description shown in tooltips today. */
  description: z.string(),
  /**
   * Optional machine-readable hook for the future damage engine. Left loose on
   * purpose until Phase 3 pins down the effect DSL.
   */
  mechanic: z.record(z.string(), z.unknown()).optional(),
});

export const ItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.number().int().nonnegative(),
  /** Total gold value if built from components; used for gold efficiency. */
  totalCost: z.number().int().nonnegative().optional(),
  tags: z.array(z.string()).default([]),
  /** "boots", "enchant", or "item" — drives which build slot it occupies. */
  slot: z.enum(["item", "boots", "enchant"]).default("item"),
  stats: StatBlockSchema.default({}),
  effects: z.array(ItemEffectSchema).default([]),
  icon: z.string().optional(),
  /** Per-value provenance: stat key or "cost" → patch version. Filled by the pipeline. */
  provenance: ProvenanceSchema.default({}),
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
  /** Per-value provenance: stat key or ability slot → patch version. Filled by the pipeline. */
  provenance: ProvenanceSchema.default({}),
});

export type Champion = z.infer<typeof ChampionSchema>;

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
