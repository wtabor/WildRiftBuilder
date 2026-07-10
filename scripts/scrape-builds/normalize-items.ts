/**
 * Item-name normalizer for the build-scraper pipeline.
 *
 * Third-party WR sites print human item names ("Serylda's Grudge", "Muramana");
 * our data keys builds by slug ("seryldas-grudge", "manamune"). This maps one to
 * the other and FAILS LOUD on anything it can't resolve — a silently-dropped
 * item would corrupt a build, and data accuracy is the moat.
 *
 * Resolution order for a raw name:
 *   1. explicit alias (upgrade forms, punctuation-free spellings)
 *   2. exact slugified match against items.json display names
 *   3. throw
 */
import itemsRaw from "../../data/patches/7.1/items.json";

type ItemRow = { id: string; name: string; slot: string };

const items = itemsRaw as ItemRow[];

/** Lowercase, drop apostrophes, collapse non-alphanumerics to single dashes. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// slugified display name -> canonical id (they're usually identical, but this
// tolerates any drift between the slug and the display spelling).
const bySlug = new Map<string, string>();
for (const it of items) {
  bySlug.set(slugify(it.name), it.id);
  bySlug.set(it.id, it.id);
}

/**
 * Aliases for names that don't slugify to our id — chiefly component/upgrade
 * forms a site may print instead of the finished item, plus known alternate
 * spellings. Extend this as new sources surface new spellings.
 */
const ALIASES: Record<string, string> = {
  // Manamune is shown either as its base or its upgraded "Muramana".
  muramana: "manamune",
  // wr-meta occasionally prints "Endless Hunger" (Manamune's passive) as a stand-in.
  "endless-hunger": "manamune",
  // Boots enchant spellings.
  "gluttonous-greaves": "gluttonous-greaves",
  // Common alternate spellings / shorthand.
  botrk: "blade-of-the-ruined-king",
  "blade-of-the-ruined-king": "blade-of-the-ruined-king",
  ga: "guardian-angel",
};

export type NormalizeResult = {
  id: string;
  slot: string;
};

/** Resolve a raw item name to our id + slot, or throw with the offending name. */
export function normalizeItem(rawName: string): NormalizeResult {
  const slug = slugify(rawName);
  const id = ALIASES[slug] ?? bySlug.get(slug);
  if (!id) {
    throw new Error(
      `normalizeItem: cannot resolve "${rawName}" (slug "${slug}"). ` +
        `Add an alias in normalize-items.ts if this is a real item.`,
    );
  }
  const row = items.find((i) => i.id === id);
  if (!row) throw new Error(`normalizeItem: alias for "${rawName}" points at missing id "${id}".`);
  return { id, slot: row.slot };
}

/** Resolve a list, partitioned into core items / boots / enchant by slot. */
export function normalizeLoadout(rawNames: string[]): {
  items: string[];
  boots?: string;
  enchant?: string;
} {
  const out: { items: string[]; boots?: string; enchant?: string } = { items: [] };
  for (const raw of rawNames) {
    const { id, slot } = normalizeItem(raw);
    if (slot === "boots") out.boots = id;
    else if (slot === "enchant") out.enchant = id;
    else out.items.push(id);
  }
  return out;
}
