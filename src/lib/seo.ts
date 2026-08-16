import { CURRENT_PATCH, patchMeta } from "@/lib/data";
import type { Champion, Item } from "@/lib/schema";

/**
 * Canonical origin for the deployed site. Everything that must be an absolute
 * URL — canonical tags, sitemap entries, OG images, JSON-LD `@id`s — derives
 * from here, so moving to a custom domain is one env-var change rather than a
 * grep-and-replace through the app.
 *
 * Kept without a trailing slash; `absoluteUrl` owns joining.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://wild-rift-builder.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "Wild Rift Builder";

/** Used as the `%s | Wild Rift Builder` suffix and in structured data. */
export const SITE_TAGLINE = "Wild Rift champion stats & item build calculator";

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const championPath = (id: string) => `/champions/${id}`;
export const itemPath = (id: string) => `/items/${id}`;

/**
 * `lastModified` for sitemap entries. Every page renders patch-versioned data,
 * so the patch release date is the honest answer — it's when the *content*
 * last changed, not when the file was touched. Falls back to today if the
 * patch has no parseable release date.
 */
export function patchLastModified(): Date {
  const d = new Date(`${patchMeta.releaseDate}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** Comma list that reads naturally: "Marksman", "Mage and Assassin". */
function joinRoles(roles: string[]): string {
  if (roles.length === 0) return "champion";
  if (roles.length === 1) return roles[0];
  return `${roles.slice(0, -1).join(", ")} and ${roles[roles.length - 1]}`;
}

/**
 * Meta description for a champion page. Front-loads the champion name and the
 * patch, because that's what the query looks like ("ashe build wild rift"),
 * and stays inside the ~155 chars Google will render.
 */
export function championDescription(c: Champion): string {
  const lvl15 = Math.round(c.stats.maxHealth.base + c.stats.maxHealth.perLevel * 14);
  return (
    `${c.name} Wild Rift stats for patch ${CURRENT_PATCH}: ${joinRoles(c.roles)}, ` +
    `${c.stats.attackDamage.base} base AD, ${lvl15} health at level 15. ` +
    `Build items and see live totals.`
  ).slice(0, 158);
}

export function itemDescription(i: Item): string {
  const stats = Object.keys(i.stats).length;
  return (
    `${i.name} in Wild Rift patch ${CURRENT_PATCH}: ${i.cost.toLocaleString("en-US")} gold, ` +
    `${stats} stat${stats === 1 ? "" : "s"}${i.effects.length ? `, ${i.effects.length} passive${i.effects.length === 1 ? "" : "s"}` : ""}. ` +
    `See full stats and build it into a champion.`
  ).slice(0, 158);
}

/* -------------------------------------------------------------------------- */
/*  JSON-LD                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Structured data is emitted as plain objects and serialized by the caller into
 * a `<script type="application/ld+json">`. Kept as data (not JSX) so it stays
 * unit-testable and out of the presentation layer.
 */
export function webApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: absoluteUrl("/"),
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    description: `${SITE_TAGLINE}. Accurate, patch-versioned data for patch ${CURRENT_PATCH}.`,
    // A free tool — declaring this explicitly is what makes the "free" badge
    // eligible rather than inferred.
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    isAccessibleForFree: true,
  };
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: t.name,
      item: absoluteUrl(t.path),
    })),
  };
}

/**
 * Champion and item pages are reference entries about a thing in a game, which
 * `Article` would overstate. `WebPage` + `about` is the honest shape and still
 * feeds the entity graph.
 */
export function referenceLd(opts: {
  name: string;
  path: string;
  description: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: opts.name,
    url: absoluteUrl(opts.path),
    description: opts.description,
    ...(opts.image ? { primaryImageOfPage: opts.image } : {}),
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
    about: {
      "@type": "Thing",
      name: opts.name,
      description: `${opts.name} in League of Legends: Wild Rift.`,
    },
    // Signals freshness to crawlers and is truthful: the data is the patch's.
    dateModified: patchLastModified().toISOString(),
  };
}
