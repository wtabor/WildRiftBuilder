import type { MetadataRoute } from "next";
import { champions, items } from "@/lib/data";
import { absoluteUrl, championPath, itemPath, patchLastModified } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * Every indexable URL: the calculator, the two index pages, and one page per
 * champion and item. `lastModified` is the patch release date for all of them
 * — the pages render patch-versioned data, so that is genuinely when their
 * content last changed. Faking a fresher date is the classic way to teach a
 * crawler to distrust the whole sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = patchLastModified();

  return [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/champions"), lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/items"), lastModified, changeFrequency: "weekly", priority: 0.9 },
    ...champions.map((c) => ({
      url: absoluteUrl(championPath(c.id)),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...items.map((i) => ({
      url: absoluteUrl(itemPath(i.id)),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
