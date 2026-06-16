# Design Workflow — three UIs, one engine

This repo carries **three distinct, fully-functional UI designs** for the Wild Rift
Builder. They all read from the same pure stat engine and patch-versioned data — only
the *presentation, layout, and interaction model* differ. This document is the playbook
for iterating on them toward the most polished result.

## The three directions

| Route | Design | Personality | Signature moves |
|---|---|---|---|
| `/designs/aurora` | **Aurora** | Modern, premium, spacious (Linear / Vercel energy) | Frosted glass panels, drifting aurora gradients, mobile bottom-sheet build summary |
| `/designs/hextech` | **Hextech Arsenal** | Immersive in-game HUD | Beveled hextech-gold panels, champion splash banner, hexagon item tiles, HUD stat bars |
| `/designs/console` | **Stat Console** | Dense pro analytics terminal (statcheck.lol energy) | Sortable item table, monospace tabular numerics, base / +items / total stat readout |

The gallery at `/` showcases all three and links into each.

## Why this structure

```
src/
├─ lib/            # SHARED, design-agnostic
│  ├─ stats/       #   pure stat engine (unit-tested) — the correctness moat
│  ├─ schema/      #   Zod schemas + types (single source of truth)
│  ├─ data/        #   typed loaders over patch JSON
│  ├─ statDisplay  #   turns engine totals into ordered display rows (shared by all panels)
│  ├─ visual.ts    #   monogram initials, deterministic colors, item-class colors
│  ├─ icons.tsx    #   inline SVG icon set (stat + UI icons)
│  └─ useShare.ts  #   copy-build-URL hook
├─ state/          # SHARED build state ↔ URL (so a build survives switching designs)
├─ designs/
│  ├─ registry.ts          # catalog that drives the gallery + switcher
│  ├─ shared/              # the (intentionally neutral) cross-design switcher
│  ├─ aurora/              # ─┐
│  ├─ hextech/             #  ├─ each design is self-contained presentation
│  └─ console/             # ─┘
└─ app/
   ├─ page.tsx             # gallery
   └─ designs/<id>/page.tsx# thin route wrappers (+ per-route metadata)
```

**Rule of thumb:** anything about *what a number is* lives in `lib/` and is shared.
Anything about *how it looks* lives in `src/designs/<id>/`. This keeps the designs
genuinely independent (edit one without touching the others) while guaranteeing the
data is identical across all three.

Because build state is encoded in the URL (`?c=…&lvl=…&i=…`), the in-app **switcher**
carries your exact build from one design to the next — so you compare them on equal
footing, not on whatever build each happened to have.

## The iteration loop

1. **Run it.** `npm run dev` (bound to `0.0.0.0` so the Preview pane can reach it).
2. **Look at it.** Review in the Preview pane at both a phone width and a desktop
   width. These are React + Tailwind responsive layouts; check the breakpoints, not
   just one size.
3. **Gate it.** Before committing, run the automated checks — they catch the failures
   that don't need eyes:

   ```bash
   npm run typecheck     # types across all designs
   npm test              # the pure engine (correctness = the moat)
   npm run validate-data # patch JSON still matches the schema
   npm run build         # production build of every route
   npm run smoke         # fetch every route, assert 200 + a content marker
   ```

4. **Iterate one design at a time.** They're isolated, so a change to Aurora can't
   regress Hextech. Re-run `npm run smoke` after structural edits.
5. **Compare.** Build something in one design, hit *switch* in the top bar, and judge
   the same build in the other two.

> **Environment note.** Web/CI sessions here have no headless browser (Chromium can't
> be downloaded under the network policy) and no outbound font CDN. So: fonts are robust
> system stacks (no `next/font` network fetch), and the automated visual signal is the
> `smoke` route-render check + the production build — pixel-level review is the Preview
> pane's job.

## Polish checklist (per design)

- [ ] **Responsive** — usable at ~360px and at ≥1280px; no horizontal overflow.
- [ ] **States** — empty (no champion), full build (6/6), no-search-results all handled.
- [ ] **Hydration-safe** — initial client render matches SSR (build state hydrates from
      the URL in an effect *after* mount; don't read `window` during render).
- [ ] **Motion** — respects `prefers-reduced-motion` (handled globally in `globals.css`).
- [ ] **A11y** — inputs labelled, buttons have titles/aria where icon-only, focus visible.
- [ ] **Consistency** — stat values come from `statDisplay`, gold from `formatGold`; never
      re-implement formatting per design.

## Adding or renaming a design

1. Add an entry to `src/designs/registry.ts` (id, name, tagline, blurb, accents, highlights).
2. Create `src/designs/<id>/<Name>Design.tsx` (a client component, default export).
3. Add `src/app/designs/<id>/page.tsx` re-exporting it with route metadata.
4. Add the route + a marker to `scripts/smoke.mjs`.
5. The gallery and switcher pick it up automatically from the registry.
