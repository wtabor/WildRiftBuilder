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

> ⚠️ The data under `data/patches/7.1/` is **illustrative sample data**, not yet hand-verified
> against in-game Wild Rift values. The patch badge shows "sample data" until `meta.json` is marked
> `"verified": true`.

## Architecture

The MVP is a stat calculator, but the schema and engines are built for the damage-optimizer end
state so Phase 3 is additive, not a rewrite.

| Path | Role |
|---|---|
| `src/lib/schema/` | Zod schemas + TS types — single source of truth (already models abilities & item effects) |
| `data/sources/`, `data/overrides/` | Hybrid data pipeline inputs: scraped source snapshots + the hand-verified numeric layer ([details](./data/sources/README.md)) |
| `scripts/import/` | Pipeline: source adapters → merge with overrides → validated patch data (`npm run build-data`) |
| `data/patches/<patch>/` | **Generated** versioned static JSON (champions, items, meta) consumed by the app |
| `src/lib/stats/` | Pure stat engine (champion + items → totals) — the MVP core |
| `src/lib/damage/` | Pure damage engine — Phase 3 stub, wired to the schema |
| `src/lib/data/` | Typed loaders/selectors over the JSON |
| `src/components/`, `src/app/` | Next.js UI |
| `scripts/validate.ts` | Schema validation gate for patch data |
| `tests/` | Engine unit tests (correctness = the moat) |

## Develop

```bash
npm install
npm run dev           # http://localhost:3000
npm run typecheck     # tsc --noEmit
npm run test          # vitest
npm run build-data    # regenerate data/patches/* from sources + overrides
npm run validate-data # schema-check all patch data
npm run build         # production build
```

## Tech

Next.js (App Router) · TypeScript · Tailwind · Zod · Vitest. Deploys on Vercel.
Supabase (accounts / saved builds) lands in Phase 2.
