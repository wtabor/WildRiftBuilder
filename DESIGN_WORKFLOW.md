# UI notes — the Meta builder

The Wild Rift Builder ships a single, polished UI — the **Meta** design — at `/`. It reads
from the same pure stat engine and patch-versioned data as everything else; only the
*presentation, layout, and interaction model* live in the design layer. This document is the
playbook for iterating on it.

## Structure

```
src/
├─ lib/            # SHARED, presentation-agnostic
│  ├─ stats/       #   pure stat engine (unit-tested) — the correctness moat
│  ├─ schema/      #   Zod schemas + types (single source of truth)
│  ├─ data/        #   typed loaders over patch JSON
│  ├─ statDisplay  #   turns engine totals into ordered display rows
│  ├─ visual.ts    #   monogram initials, deterministic colors, item-class colors, champion icon URLs
│  ├─ icons.tsx    #   inline SVG icon set (stat + UI icons)
│  └─ useShare.ts  #   copy-build-URL hook
├─ state/          # SHARED build state ↔ URL (?c=…&lvl=…&i=…) → shareable builds
├─ designs/
│  └─ meta/MetaDesign.tsx   # the UI: a client component, default export (presentation only)
└─ app/
   ├─ page.tsx     # the route — renders MetaDesign
   └─ layout.tsx   # root layout; self-hosts the Geist font
```

**Rule of thumb:** anything about *what a number is* lives in `lib/` and is shared. Anything
about *how it looks* lives in `src/designs/meta/`. Keep formatting in `statDisplay` / `formatGold`
— never re-implement it in the component.

## Icons

- **Champions** render real Data Dragon art via `championIconUrl()` (`lib/visual.ts`), laid over
  the monogram tile in an `<img>` with an `onError` fallback — a stale CDN version or missing asset
  degrades to the initials tile, never a broken image. Each champion carries its Data Dragon key
  in `icon` (e.g. `Ashe`, or `MonkeyKing` for Wukong).
- **Items** keep colored monograms: Wild Rift items diverge from PC League and lack a canonical
  public icon CDN (see [PLAN.md §3](./PLAN.md)). The same `Portrait` `src`/fallback path is ready —
  populate each item's `icon` with a verified URL to light them up.

## The iteration loop

1. **Run it.** `npm run dev` (bound to `0.0.0.0` so the Preview pane can reach it).
2. **Look at it.** Review in the Preview pane at both a phone width and a desktop width — these are
   responsive Tailwind layouts; check the breakpoints, not just one size.
3. **Gate it.** Before committing, run the automated checks:

   ```bash
   npm run typecheck     # types
   npm test              # the pure engine (correctness = the moat)
   npm run validate-data # patch JSON still matches the schema
   npm run build         # production build
   npm run smoke         # fetch the route, assert 200 + a content marker
   ```

> **Environment note.** Web/CI sessions here have no headless browser (Chromium can't be
> downloaded under the network policy), and the League CDN is outside the egress allowlist — so
> champion art can't be fetched *from this container*, but it loads fine in a real browser hitting
> the deployed page (the browser fetches the CDN directly). The Geist font is self-hosted via the
> `geist` package (bundled woff2, no build-time network). The automated visual signal is the
> `smoke` route-render check plus the production build; pixel-level review is the Preview pane's job.

## Polish checklist

- [ ] **Responsive** — usable at ~360px and at ≥1280px; no horizontal overflow.
- [ ] **States** — empty (no champion), full build (6/6), no-search-results all handled.
- [ ] **Hydration-safe** — initial client render matches SSR (build state hydrates from the URL in
      an effect *after* mount; don't read `window` during render).
- [ ] **Motion** — respects `prefers-reduced-motion` (handled globally in `globals.css`).
- [ ] **A11y** — inputs labelled, icon-only buttons have titles/aria, focus visible.
- [ ] **Consistency** — stat values come from `statDisplay`, gold from `formatGold`; never
      re-implement formatting in the component.
