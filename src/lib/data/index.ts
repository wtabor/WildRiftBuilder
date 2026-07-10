import {
  ChampionsFileSchema,
  ItemsFileSchema,
  PatchMetaSchema,
  BuildsFileSchema,
  type Champion,
  type Item,
  type BuildPreset,
  type PatchMeta,
  type Provenance,
} from "@/lib/schema";

import championsRaw from "@data/patches/7.2/champions.json";
import itemsRaw from "@data/patches/7.2/items.json";
import metaRaw from "@data/patches/7.2/meta.json";
import buildsRaw from "@data/patches/7.2/builds.json";
import registryRaw from "@data/patches/registry.json";

/**
 * The currently shipped patch. When a new patch is hand-verified, add its
 * folder under data/patches/<patch>/ and bump these imports (or, later, make
 * this dynamic with a patch selector).
 */
export const CURRENT_PATCH = "7.2";

// Parse once at module load so any malformed data fails loudly and early.
export const patchMeta: PatchMeta = PatchMetaSchema.parse(metaRaw);
export const champions: Champion[] = ChampionsFileSchema.parse(championsRaw);
export const items: Item[] = ItemsFileSchema.parse(itemsRaw);
export const builds: BuildPreset[] = BuildsFileSchema.parse(buildsRaw);

const championById = new Map(champions.map((c) => [c.id, c]));
const itemById = new Map(items.map((i) => [i.id, i]));
const buildsByChampion = new Map<string, BuildPreset[]>();
for (const b of builds) {
  const list = buildsByChampion.get(b.championId);
  if (list) list.push(b);
  else buildsByChampion.set(b.championId, [b]);
}

export function getChampion(id: string): Champion | undefined {
  return championById.get(id);
}

export function getItem(id: string): Item | undefined {
  return itemById.get(id);
}

export function getItems(ids: string[]): Item[] {
  return ids.map((id) => itemById.get(id)).filter((i): i is Item => Boolean(i));
}

/** Curated "standing builds" for a champion, in authored order. */
export function getBuilds(championId: string): BuildPreset[] {
  return buildsByChampion.get(championId) ?? [];
}

/* -------------------------------------------------------------------------- */
/*  Provenance — "which patch did this value last change in?"                  */
/* -------------------------------------------------------------------------- */

export interface PatchInfo {
  /** ISO date the patch released. */
  date: string;
  /** Link to the patch notes, if known. */
  url?: string;
}

const patchRegistry = registryRaw as Record<string, PatchInfo>;

/** Look up release date + notes URL for a patch version, if registered. */
export function getPatchInfo(version: string | undefined): PatchInfo | undefined {
  return version ? patchRegistry[version] : undefined;
}

/**
 * Resolve the patch a single displayed value last changed in. Falls back to the
 * dataset baseline (CURRENT_PATCH) when an entity carries no explicit stamp for
 * that key — so an unstamped dataset still reads as "verified against current".
 */
export function provenanceFor(
  provenance: Provenance | undefined,
  key: string,
): string {
  return provenance?.[key] ?? CURRENT_PATCH;
}
