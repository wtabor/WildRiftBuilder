# Wild Rift Builder — Project Plan

> An accurate, current, interactive **stat & build calculator for League of Legends: Wild Rift**.
> Think "[statcheck.lol](https://statcheck.lol/) for Wild Rift" today, growing toward
> "[lolmath.net](https://lolmath.net/) for Wild Rift" (full damage modeling) as the end state.

## 1. Why this project exists

The PC League ecosystem has rich stat/build tooling. Wild Rift does not. What exists today is
either the wrong category or low quality:

| Tool | Category | Gap |
|---|---|---|
| [wrstat.com](https://wrstat.com/), [wildriftstats.org](https://www.wildriftstats.org/), [rankedwr.com](https://rankedwr.com/), [jungler.gg](https://jungler.gg/wild-rift/) | Win-rate / tier aggregators | Not calculators |
| [wildriftfire.com](https://www.wildriftfire.com/), [lolwildriftbuild.com](https://lolwildriftbuild.com/), [wr-meta.com](https://wr-meta.com/) | Static build guides | No interactivity |
| [riftgg.app/items](https://www.riftgg.app/en/items) | Item database | Lookup table, not a builder |
| [wr-database.vercel.app/calculator](https://wr-database.vercel.app/calculator) | Calculator | Only real competitor; hobby-grade |
| "Probuilds" mobile apps | Build guides | **Outdated item stats, no AD/AP filtering** (per user reviews) |

**Opportunity:** there is no polished, *accurate*, *current* interactive calculator for Wild Rift.
Accuracy + freshness is the moat — it is exactly what every existing tool fails at.

## 2. Reference tools, categorized

- **Raw stat calculators** — [statcheck.lol](https://statcheck.lol/): champ + items + level → summed stats.
  Deliberately scoped to raw item stats first, adding passives "gradually." **This is our MVP target.**
- **Damage / build optimizers** — [lolmath.net](https://lolmath.net/), [calc.gg](https://calc.gg/): model abilities,
  scalings, runes, item passives, enemy resistances → real damage, combos, DPS, optimal builds, duel sims.
  **This is our end-state target.**
- **Aggregators** — [u.gg](https://u.gg/), [mobafire](https://www.mobafire.com/): match-data-driven popular/win-rate
  builds + community guides. Optional later phase.

## 3. The core challenge: Wild Rift has no clean data source

This is the make-or-break of the project.

- **Riot Data Dragon describes *PC* League, not Wild Rift.** WR has different items, stats, champion
  balance, and ability numbers. Using ddragon directly = confidently wrong results.
- **No official public WR item/stat API.** WR stat data effectively lives in the **Chinese WR client API**,
  which community projects scrape.
- Community sources:
  - [ry2x/WildRift-Merged-Champion-Data](https://github.com/ry2x/WildRift-Merged-Champion-Data) — MIT, daily
    JSON. Mostly champion *metadata* (roles, lanes, ratings, rotation), **not** base/per-level/ability stats.
    Good for champion lists & images.
  - [HuiDiHu/statsWR](https://github.com/HuiDiHu/statsWR) — win/pick/ban stats + public API.
  - Community Dragon — supplementary assets.

### Data strategy: **Hybrid (scrape → hand-verify)**

1. **Scrape/import** what we can from CN WR API / riftgg / wrfire / ry2x into a draft dataset.
2. **Hand-verify & correct** item stats and champion base/growth numbers each patch.
3. **Commit as versioned static JSON** (`data/patches/<patch>/…`), validated by a strict schema (Zod).

Why static JSON in-repo:
- This environment is **network-allowlisted** — a live fetch pipeline can't reach arbitrary hosts at
  build/runtime. Static data sidesteps that.
- Fast, cacheable, CDN-friendly, trivially auditable (git diff per patch), and deterministic for tests.

## 4. Architecture (designed for the damage-optimizer end state)

The MVP is a stat calculator, but the architecture is built so Phase 3 damage modeling drops in
without a rewrite. Key principle: **the data schema and calc engine already model abilities, scalings,
and item effects as first-class — the MVP simply doesn't surface them yet.**

```
wildriftbuilder/
├─ data/
│  ├─ patches/<patch>/champions.json   # base stats, per-level growth, abilities (full schema now)
│  ├─ patches/<patch>/items.json       # stats, cost, passives/actives (effects modeled, unused in MVP)
│  └─ patches/<patch>/meta.json        # patch id, date, source provenance
├─ scripts/
│  ├─ import/                          # scrapers/importers → draft JSON (hybrid step 1)
│  └─ validate.ts                      # schema validation gate (CI)
├─ src/
│  ├─ lib/
│  │  ├─ schema/                       # Zod schemas + TS types (single source of truth)
│  │  ├─ data/                         # typed loaders/selectors over the JSON
│  │  ├─ stats/                        # PURE stat engine: base+growth+items → totals  (MVP core)
│  │  └─ damage/                       # PURE damage engine: abilities×scalings×resists (Phase 3 stub)
│  ├─ components/                      # shop, champion picker, stat panel, build bar, compare
│  ├─ app/                             # Next.js App Router routes
│  └─ state/                           # build state ↔ URL params (shareable builds)
└─ tests/                             # unit tests for the engines (correctness = the moat)
```

Design rules:
- **Engines are pure & UI-free** (`lib/stats`, `lib/damage`) so the math is independently unit-tested.
  Being *correct* where competitors are wrong is the whole value prop.
- **Schema is the single source of truth** — abilities and item effects are modeled from day one,
  even though the MVP UI only reads raw stats.
- **Build state lives in the URL** → shareable builds, no backend needed for MVP.

## 5. Roadmap

### Phase 1 — MVP: stat calculator *(current focus)*
- Champion picker + level slider (1–15; WR level cap is 15).
- Item shop: search + **filter by stat type (AD/AP/armor/…)** — the feature mobile apps lack.
- Build bar: up to 6 items + boots/enchant.
- Live stat panel: total AD, AP, attack speed, crit, armor, MR, max HP, mana, move speed,
  ability haste, lethality, magic pen, lifesteal, omnivamp, heal/shield power, etc.
  = champion base + per-level growth + item stats.
- Gold total + per-stat gold efficiency.
- Shareable build URL + patch badge (trust signal: "data current as of patch X").

### Phase 2 — comparison, accounts, passives
- A/B build side-by-side comparison.
- Item passive/active effects surfaced in the stat panel.
- Save builds → **Supabase (Postgres + Auth)**.

### Phase 3 — damage modeling (lolmath tier, the end state)
- Ability scalings + skill order, combo damage vs a target with chosen armor/MR/HP.
- DPS, effective HP, burst windows, rune effects.
- (Stretch) optimal-build search.

### Phase 4 — aggregation (optional)
- Popular / win-rate builds via a WR stats source (e.g. statsWR).

## 6. Tech stack

- **Next.js (App Router) + TypeScript + Tailwind**, deployed on **Vercel**.
- **Zod** schemas → shared TS types for data + engines.
- **Vitest** for engine unit tests.
- **Supabase** (Phase 2+) for accounts & saved builds.
- Static patch-versioned JSON as the data layer; importers in `scripts/`.

## 7. Open questions / risks

- **Data accuracy & upkeep** is the recurring cost — needs a per-patch verification routine.
- CN WR API access from CI may be blocked by the allowlist → importers may need to run locally,
  with verified output committed.
- Ability/passive data is the hardest to source for Phase 3 and will be largely hand-authored.
