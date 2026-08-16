# Phase 3 — Damage engine roadmap & loop queue

The end-state from `PLAN.md` §5: take the app from a **stat** calculator to a
**damage** calculator (the "lolmath.net for Wild Rift" vision). This file is both
the plan and the **work queue for the Phase-3 engine loop** (`.github/workflows/
phase3-engine.yml`, see "Loop design" below) — the loop reads the checklist,
implements the first unchecked slice, and checks it off in its PR. Same idea as
`ROSTER.md` was for the backfill loop.

> Correctness is the moat. Every slice ships **with unit tests** in `tests/`, and
> every engine PR gets a `stat-engine-reviewer` pass. A slice isn't "done" until
> `typecheck` + `test` + `validate-data` + `build` are green.

## Where the engine already is

`src/lib/damage/engine.ts` is **not** a bare stub — pass 1 is built and live:

- `resistMultiplier`, `effectiveResist` (shred → %pen → flat pen, floored at 0),
  `PERCENT_PEN_CAP` (40%).
- `rawAbilityDamage` / `mitigatedAbilityDamage` — single-cast ability damage for
  `attackDamage` / `abilityPower` / `maxHealth` scalings.
- `autoAttackDps` — sustained auto-attack DPS with crit (incl. IE Limit Break),
  on-hit item mechanics (Kraken/BotRK/Wit's End/…), penetration and armor shred.
  Already consumed by `AerstrikeDesign.tsx` ("Auto-attack damage" panel).

The schema (`src/lib/schema/index.ts`) already models what the remaining slices
need: `AbilityScalingSchema` supports `bonusAttackDamage` / `bonusHealth`;
`CombatMechanicSchema` covers onHit/crit/pen/shred; item effects carry
`kind: "active" | "passive"`.

## Slice checklist (ordered — the loop takes the FIRST unchecked box)

Order matters: later slices build on earlier ones, so the loop must not skip
ahead (see "Loop design" for the serialization rule).

- [ ] **S1 — Bonus-stat separation in the stat engine.** Have `computeBuild`
  expose base vs. bonus AD and base vs. bonus max-health (bonus = totals minus
  champion base-at-level), without changing existing totals/output. Foundation
  for every ability scaling that keys off *bonus* stats.
  _Files:_ `src/lib/stats/engine.ts`, `tests/engine.test.ts`.
- [ ] **S2 — Ability damage: bonus scalings + penetration + mitigation.** Resolve
  `bonusAttackDamage` / `bonusHealth` scalings in `rawAbilityDamage` (using S1),
  and apply the attacker's lethality / %pen / flat pen / shred to
  `mitigatedAbilityDamage`, mirroring the auto-attack path. Multi-instance/DoT
  abilities out of scope here (schema stores rank-1/per-tick values — note it).
  _Files:_ `src/lib/damage/engine.ts`, `tests/damage.test.ts`.
- [ ] **S3 — Skill order & ability rank from level.** Derive each ability's rank
  at a given champion level from a skill-priority order (max R → priority slot →
  …), respecting WR rank caps. Feeds correct `abilityRank` into S2 automatically.
  _Files:_ `src/lib/damage/` (new `skillorder.ts`), `tests/damage.test.ts`.
- [ ] **S4 — Combo builder.** A typed sequence of casts (abilities + autos) →
  total mitigated combo damage vs. a `TargetContext`, plus a windowed DPS using
  cooldowns and ability haste. Pure function, no UI.
  _Files:_ `src/lib/damage/` (new `combo.ts`), `tests/damage.test.ts`.
- [ ] **S5 — Item actives in the damage model.** Fold `kind: "active"` item
  effects (e.g. Galeforce-style burst) into combos/burst so item actives count.
  _Files:_ `src/lib/damage/`, schema if an active needs a new mechanic field,
  `tests/damage.test.ts`.
- [ ] **S6 — Effective HP & burst check.** Target EHP vs. physical/magic given
  armor/MR, and a "does this combo kill a target with X HP / armor / MR" burst
  verdict + overkill/margin.
  _Files:_ `src/lib/damage/` (new `ehp.ts`), `tests/damage.test.ts`.
- [ ] **S7 — UI: damage panel in AerStrike.** Target armor/MR/HP inputs + a
  readout of per-ability damage, full-combo damage, DPS, and the burst verdict.
  Presentation only — reads engine outputs, formats via the shared display
  helpers (no math in the component).
  _Files:_ `src/designs/aerstrike/`, `aerstrike.css`.
- [ ] **S8 — (Stretch) Optimal-build search.** Given champion + target, search
  item combinations maximizing combo damage / DPS under a gold budget.
  _Files:_ `src/lib/damage/` (new `optimize.ts`), `tests/damage.test.ts`.

When a box is checked, add a one-line note after it: `(PR #NN)`.

## Loop design — `phase3-engine.yml` (NOT YET CREATED; enable when ready)

Mirrors the shape of the existing loops (`data-verify.yml` / `patch-watch.yml`):
`anthropics/claude-code-action@v1`, same secrets, `concurrency` guard, the CI
gate before opening a PR. Key differences, because engine slices depend on each
other and must be reviewed in order:

- **One slice per run, once a day** (`cron`), plus `workflow_dispatch`. No
  self-dispatch/PAT — same decision as patch-watch.
- **Serialize on merge, don't skip ahead.** The agent reads this checklist and
  targets the **first unchecked** slice. Before working it, `gh pr list` — if
  that slice already has an open PR (`claude/phase3-<id>` branch), **stop**
  (don't jump to the next box): the next slice may depend on the one under
  review. So a new slice only starts after the previous slice's PR is merged and
  its box is checked in `main`.
- **Each run:** implement the slice, add/extend tests in `tests/`, run
  `typecheck` + `test` + `validate-data` + `build`, check its box here (with the
  PR number), branch `claude/phase3-<slice-id>`, open PR
  "Phase 3 <Sx>: <title>". Keep the PR to a single slice.
- **Prompt must require:** pure engine functions (UI-free in `src/lib/damage`),
  Wild Rift mechanics only, and a note in the PR body on any modeling assumption
  (as pass 1 already documents its "sustained"/full-health-target choices).

To turn the loop on: add `.github/workflows/phase3-engine.yml` per the above and
merge it to `main`. Until then, slices can also just be done by hand — this
checklist is the source of truth either way.
