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

## Three design directions

The builder ships as **three distinct, polished UIs** over one shared engine — open the
gallery at `/` to compare, or jump straight in:

| Route | Design | Personality |
|---|---|---|
| `/designs/aurora` | **Aurora** | Modern premium SaaS — glassmorphism, drifting gradients, mobile bottom-sheet |
| `/designs/hextech` | **Hextech Arsenal** | Immersive in-game HUD — beveled gold panels, hex item tiles, splash banner |
| `/designs/console` | **Stat Console** | Dense pro terminal — sortable item table, monospace stats, delta-from-base |

Build state is URL-encoded, so the in-app switcher carries the same build across all
three. The full iteration playbook lives in **[DESIGN_WORKFLOW.md](./DESIGN_WORKFLOW.md)**.

> ⚠️ The data under `data/patches/7.1/` is **illustrative sample data**, not yet hand-verified
> against in-game Wild Rift values. The patch badge shows "sample data" until `meta.json` is marked
> `"verified": true`.

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
| `src/designs/<id>/` | The three self-contained UI designs (presentation only) |
| `src/app/` | Next.js routes — gallery (`/`) + `designs/<id>` |
| `scripts/validate.ts` | Schema validation gate for patch data |
| `scripts/smoke.mjs` | Route render check (the automated half of the design loop) |
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

## Tech

Next.js (App Router) · TypeScript · Tailwind · Zod · Vitest. Deploys on Vercel.
Supabase (accounts / saved builds) lands in Phase 2.
