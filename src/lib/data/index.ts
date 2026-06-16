import {
  ChampionsFileSchema,
  ItemsFileSchema,
  PatchMetaSchema,
  PatchRegistrySchema,
  type Champion,
  type Item,
  type PatchMeta,
  type PatchRegistry,
  type PatchRegistryEntry,
} from "@/lib/schema";

import championsRaw from "@data/patches/7.1/champions.json";
import itemsRaw from "@data/patches/7.1/items.json";
import metaRaw from "@data/patches/7.1/meta.json";
import registryRaw from "@data/patches/registry.json";

/**
 * The currently shipped patch. When a new patch is hand-verified, add its
 * folder under data/patches/<patch>/ and bump these imports (or, later, make
 * this dynamic with a patch selector).
 */
export const CURRENT_PATCH = "7.1";

// Parse once at module load so any malformed data fails loudly and early.
export const patchMeta: PatchMeta = PatchMetaSchema.parse(metaRaw);
export const champions: Champion[] = ChampionsFileSchema.parse(championsRaw);
export const items: Item[] = ItemsFileSchema.parse(itemsRaw);
export const patchRegistry: PatchRegistry = PatchRegistrySchema.parse(registryRaw);

/** Resolve a patch version to its release date + notes URL, if known. */
export function getPatchInfo(version: string | undefined): PatchRegistryEntry | undefined {
  return version ? patchRegistry[version] : undefined;
}

const championById = new Map(champions.map((c) => [c.id, c]));
const itemById = new Map(items.map((i) => [i.id, i]));

export function getChampion(id: string): Champion | undefined {
  return championById.get(id);
}

export function getItem(id: string): Item | undefined {
  return itemById.get(id);
}

export function getItems(ids: string[]): Item[] {
  return ids.map((id) => itemById.get(id)).filter((i): i is Item => Boolean(i));
}
