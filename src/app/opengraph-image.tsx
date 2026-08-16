import { ImageResponse } from "next/og";
import { champions, items, CURRENT_PATCH } from "@/lib/data";
import { SITE_NAME } from "@/lib/seo";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE_NAME} — Wild Rift champion stats & item build calculator`;

/**
 * One site-wide social card, generated at build time. Deliberately not
 * per-route: 250+ routes would mean 250+ rendered PNGs on every build for a
 * marginal gain, and Next lets child routes inherit this one.
 *
 * Plain inline styles only — Satori (what ImageResponse runs on) supports a
 * flexbox subset, not Tailwind.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0d10",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "#ff6b1a",
              display: "flex",
            }}
          />
          <div
            style={{
              color: "#8b8f9a",
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Wild Rift Builder
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ color: "#f5f6f8", fontSize: 82, fontWeight: 700, lineHeight: 1.05, display: "flex" }}>
            Champion stats &amp; item
          </div>
          <div style={{ color: "#ff6b1a", fontSize: 82, fontWeight: 700, lineHeight: 1.05, display: "flex" }}>
            build calculator.
          </div>
        </div>

        <div style={{ display: "flex", gap: 56, alignItems: "flex-end" }}>
          {[
            [String(champions.length), "CHAMPIONS"],
            [String(items.length), "ITEMS"],
            [CURRENT_PATCH, "PATCH"],
          ].map(([value, label]) => (
            <div key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ color: "#f5f6f8", fontSize: 46, fontWeight: 700, display: "flex" }}>{value}</div>
              <div style={{ color: "#8b8f9a", fontSize: 22, letterSpacing: 3, display: "flex" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
