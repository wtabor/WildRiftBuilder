# Roster coverage

Tracks how much of the live Wild Rift roster is in the app. The
**Roster Backfill** workflow (`.github/workflows/data-backfill.yml`) updates
this as it adds entities; the **Data Accuracy Verify** workflow
(`.github/workflows/data-verify.yml`) keeps the shipped values correct.

| Category   | Entries | Total (live) | Status                  |
| ---------- | ------- | ------------ | ----------------------- |
| Champions  | 139     | 139          | stats/roles/titles done |
| Items      | 100     | 100          | complete                |

## Field completeness (champions, patch 7.1g)

- **stats** — ✅ all 139. Verified accurate; a June 2026 audit re-fetched a
  7-champion sample (aatrox, akali, akshan, alistar, amumu, blitzcrank, brand)
  from the official WR wiki + wildriftfire and they matched the shipped values
  exactly.
- **resourceType** — ✅ all 139.
- **roles** — ✅ all 139 (ry2x CN-API class booleans, PR #17; WR-exclusive
  `norra` filled manually). Minor follow-ups for the verify workflow: `ashe`
  is [Marksman] (ry2x also tags Support); `shyvana` is [Fighter,Tank]
  (ry2x tags [Fighter,Mage]).
- **title** — ✅ all 139. English lore titles (identical PC↔WR, pure character
  identity) from Data Dragon `16.13.1`; Ambessa ("Matriarch of War") and the
  WR-exclusive Norra ("the Portal Mistress") cross-checked against WR sources.
- **abilities** — ⚠️ only ashe, ahri, darius have ability data (1–2 each). The
  other 136 have `abilities: []` (schema-valid; the damage engine does not
  consume abilities yet). **The only remaining champion gap** and the
  highest-risk to backfill — exact per-rank ability damage must come from a
  primary WR source, cross-checked ≥2 sources. Batch ~8 champions per PR.

## Items note

`goredrinker`, `stridebreaker`, `galeforce`, `dream-maker`, `protobelt` and
`stasis`, `quicksilver`, `veil`, `gargoyle`, `glorious` are **boot
enchantments** with `stats: {}` — correct as-is. In Wild Rift boot enchantments
grant only an active/passive, no flat stats (verified against the WR wiki). Do
not "fill" them. (Patch 7.2 removes boot enchants entirely.)
