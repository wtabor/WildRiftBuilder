import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // `/meta` is the deprecated design kept only for reference. It renders
        // the same dataset as `/`, so leaving it crawlable would be duplicate
        // content competing with the real home page. `/aerstrike` is a bare
        // redirect and has nothing to index.
        disallow: ["/meta", "/aerstrike"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
