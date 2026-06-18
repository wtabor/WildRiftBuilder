# Wild Rift Builder

An accurate, current, interactive **stat & build calculator for League of Legends: Wild Rift** —
think [statcheck.lol](https://statcheck.lol/) for Wild Rift today, growing toward
[lolmath.net](https://lolmath.net/)-style damage modeling as the end state.

See **[PLAN.md](./PLAN.md)** for the full research, competitive landscape, data strategy, and roadmap.

## Why

The PC League ecosystem has rich stat tooling; Wild Rift does not. Existing WR tools are either
win-rate aggregators, static guides, or low-quality mobile apps with **outdated item stats and no
stat filtering**. There is no polished, *accurate*, *current* interactive calculator. That gap —
accuracy + freshness — is the entire point of this project.

## MVP (Phase 1) — what works now

- Champion picker + level slider (1–15).
- Item shop with **search and stat-type filters** (AD / AP / AS / Crit / Armor / MR / Health / Haste).
- Build bar (up to 6 items) with running gold cost and per-item gold efficiency.
- Live total stat panel (champion base + per-level growth + item stats), grouped offense/defense/utility.
- Shareable builds via URL; a patch badge that signals whether the data is hand-verified.

## The interface

The builder is a single, polished UI — the **Meta** design — served at `/`: a U.GG-style
structure on a light, trajectory.ai-inspired surface, over the shared stat engine. UI notes
and the polish checklist live in **[DESIGN_WORKFLOW.md](./DESIGN_WORKFLOW.md)**.

- **Champion portraits** are real art from Riot's Data Dragon CDN — the Wild Rift roster
  matches PC League character-for-character — with a colored monogram fallback if an image
  fails to load.
- **Item tiles** use colored monograms for now: Wild Rift items diverge from PC League and
  have no canonical public icon CDN (see [PLAN.md §3](./PLAN.md)), so real item art waits on
  a verified Wild Rift asset source rather than showing wrong League icons.

Build state is URL-encoded, so any build is shareable straight from its link.

> ✅ The data under `data/patches/7.1/` (patch **7.1g**) has been verified against the official
> Riot 7.1g patch notes and the official Wild Rift wiki item infoboxes (`meta.json` →
> `"verified": true`). Champion stats remain illustrative pending a separate verification pass.

## Architecture

The MVP is a stat calculator, but the schema and engines are built for the damage-optimizer end
state so Phase 3 is additive, not a rewrite.

| Path | Role |
|---|---|
| `src/lib/schema/` | Zod schemas + TS types — single source of truth (already models abilities & item effects) |
| `data/patches/<patch>/` | Versioned, hand-verifiable static JSON (champions, items, meta) |
| `src/lib/stats/` | Pure stat engine (champion + items → totals) — the MVP core |
| `src/lib/damage/` | Pure damage engine — Phase 3 stub, wired to the schema |
| `src/lib/data/` | Typed loaders/selectors over the JSON |
| `src/lib/statDisplay.ts`, `src/lib/visual.ts`, `src/lib/icons.tsx` | Shared, design-agnostic presentation helpers |
| `src/designs/meta/` | The Meta builder UI (presentation only) |
| `src/app/` | Next.js route — the builder at `/` |
| `scripts/validate.ts` | Schema validation gate for patch data |
| `scripts/smoke.mjs` | Route render check (the automated UI gate) |
| `tests/` | Engine unit tests (correctness = the moat) |

## Develop

```bash
npm install
npm run dev           # http://localhost:3000
npm run typecheck     # tsc --noEmit
npm run test          # vitest
npm run validate-data # schema-check all patch data
npm run build         # production build
npm run smoke         # fetch every route, assert 200 (needs `npm run dev` running)
```

## Automated data upkeep

Accuracy + freshness is the moat, so two Claude-Code-driven GitHub Actions keep the
dataset honest and complete (see `.github/workflows/`). Both need an `ANTHROPIC_API_KEY`
repo secret; the backfill loop additionally needs a `WORKFLOW_PAT` (a PAT with
`repo` + `workflow` scope) to re-dispatch itself across batches.

| Workflow | Trigger | What it does |
|---|---|---|
| **Data Accuracy Verify** (`data-verify.yml`) | Daily (07:00 UTC) + manual | Audits every champion/item we ship against verified sources (official patch notes, riftgg, wildriftfire), corrects discrepancies on a branch, and opens a PR. Files an issue if a source is unreachable. |
| **Roster Backfill** (`data-backfill.yml`) | Manual | Adds missing champions/items a batch per run and re-triggers itself until the full live roster is in the app. Each batch opens a PR; progress is tracked in [ROSTER.md](./ROSTER.md). |

## Tech

Next.js (App Router) · TypeScript · Tailwind · Zod · Vitest · Geist (self-hosted). Deploys on Vercel.
Supabase (accounts / saved builds) lands in Phase 2.
