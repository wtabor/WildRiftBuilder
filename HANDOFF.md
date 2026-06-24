# Handoff: finish the Wild Rift roster + item data

Paste this whole file as the opening prompt in a fresh **local** Claude Code
session (run from the repo root, on a branch). Local has unrestricted network,
which is the only thing the remote session was missing.

---

## Goal

Finish the dataset under `data/patches/7.1/` so the app ships the **full live
Wild Rift roster (patch 7.1g)** with **verified, schema-valid** data. As of
June 2026 the only remaining gap is champion **abilities** (see below) — stats,
roles, titles, resourceType and the item set are all complete.

**Accuracy is the product's whole differentiator. Do NOT fabricate stats.**
Every number must come from a verified source (below). If a value can't be
confirmed, leave the entity out of the batch rather than guess.

## What's already done (don't redo)

- Damage engine (`src/lib/damage/engine.ts`): auto-attack DPS, crit, on-hit,
  penetration, resist mitigation — complete and tested.
- Item combat `mechanic` data + the always-on penetration fix — complete.
- Stat engine, gold efficiency, build state, URL sharing, compare UI, target
  dummy — complete.

## Already done (don't redo)

- **stats** — all 139 champions have full base+growth stats, verified accurate
  (a June 2026 audit re-fetched a 7-champion sample from the WR wiki +
  wildriftfire and they matched exactly). PR #17 + earlier backfills.
- **roles + resourceType** — all 139 filled (ry2x CN-API; PR #17). The
  WR-exclusive **norra** was filled manually (Mage / mana).
- **title** — all 139 filled with English lore titles (Data Dragon; this PR).
- **items** — all 100 complete. The 10 boot **enchants** (`goredrinker,
  stridebreaker, galeforce, dream-maker, protobelt, stasis, quicksilver, veil,
  gargoyle, glorious`) are correctly `stats: {}`: in Wild Rift boot enchants
  grant only an active/passive, no flat stats (verified on the WR wiki).
  Do NOT "fill" them — that would be fabrication. (Patch 7.2 removes boot
  enchants entirely, so the 7.2 update deletes these 10 rather than editing.)

## What's missing (the entire remaining task)

### Champion abilities — 136 of 139 empty
Only **ashe, ahri, darius** have ability data (1–2 abilities each — use them as
the shape reference). Every other champion has `abilities: []`. This is the
**only** remaining champion gap.

⚠️ Highest-risk backfill: exact per-rank `baseDamage`, `scalings`, and
`cooldown` must come from a primary WR source and be cross-checked ≥2 sources —
a page-summarizer fetch demonstrably misreads exact ability numbers. The damage
engine does not consume `abilities` yet, so this is lower-urgency than its size
suggests. Batch ~8 champions per PR.

## Schemas (authoritative: `src/lib/schema/index.ts`)

Champion:
```ts
{
  id, name, title, icon,
  roles: string[],                 // e.g. ["Fighter","Tank"]
  resourceType: "mana"|"energy"|"none",
  stats: {
    attackDamage:  { base, perLevel },
    abilityPower?: { base, perLevel },   // omit for non-AP-base champs
    attackSpeed:   { base, perLevel },   // base = base AS (~0.65), perLevel = AS growth ratio
    armor:         { base, perLevel },
    magicResist:   { base, perLevel },
    maxHealth:     { base, perLevel },
    healthRegen:   { base, perLevel },
    mana:          { base, perLevel },   // for energy/none, use sensible base/0
    manaRegen:     { base, perLevel },
    moveSpeed: number,                   // flat, no growth
    critDamageBase: number               // default 0.75
  },
  abilities: Ability[]
}
```
Ability:
```ts
{
  slot: "passive"|"Q"|"W"|"E"|"R",
  name, description,
  baseDamage: number[],                  // per rank, e.g. [60,110,160,210]
  damageType: "physical"|"magic"|"true"|"none",
  scalings: { stat: "attackDamage"|"bonusAttackDamage"|"abilityPower"|"maxHealth"|"bonusHealth", ratio: number }[],
  cooldown: number[]
}
```
Item combat mechanic (optional, on an item effect):
```ts
// onHit:  { kind:"onHit", damageType, flat?|flatByLevel?:[l1,l15]|currentHealthPct?+min?, everyNth? }
// crit:   { kind:"crit", critDamageBonus?, limitBreak? }
// pen:    { kind:"pen", lethality?, armorPenPercent?, magicPenPercent? }   // ONLY for conditional pen; always-on pen goes in item.stats
// shred:  { kind:"shred", armorPercent? }
```

## Verified sources (in priority order)
1. Official patch notes — https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-7-1g/
2. Official wiki infoboxes — https://wiki.leagueoflegends.com/en-us/WR:Items and per-champion WR pages
3. https://www.wildriftfire.com/ and/or https://riftgg.app/ for per-patch stat tables

### Supplementary (reachable even on a GitHub-only policy — verified during scan)
- `ry2x/WildRift-Champs` — sourced from the **Tencent CN Wild Rift API**, daily-updated.
  - Per-champion JSON: https://ry2x.github.io/WildRift-Champs/hero.json (branch `gh-pages`;
    raw: `https://raw.githubusercontent.com/ry2x/WildRift-Champs/gh-pages/hero.json`)
  - English merged data: `ry2x/WildRift-Merged-Champion-Data` → `data_en.json`.
  - Authoritative for: **roles** (class booleans `is_fighter`…`is_tank`), lane tags
    (`is_top/is_mid/is_jg/is_sup/is_ad`), WR availability (`is_wr`), `hero_id`, name/title.
  - **Does NOT contain** base stats, per-level growth, or ability numbers — get those
    from sources 1–3 above. Use ry2x to fill `roles`/`resourceType` and to build the
    authoritative champion list, then layer the verified numeric stats on top.

Cross-check stat tables against at least two sources where possible. Record any
value that changed this patch in the entity's optional `provenance` map
(`"<key>": "7.1g"`).

## Workflow
- Work in **batches of ~8 entities per PR** (a single giant PR is unreviewable).
- Branch per batch off `main`; descriptive commits.
- After each batch, run: `npm run validate-data && npm run typecheck && npm test && npm run build` — all must pass.
- Open a ready-for-review PR per batch. Keep going until the roster + items are complete.
- Update **`ROSTER.md`** counts/list each batch. Once the full live roster +
  items are in and cross-verified, set `meta.json` → `"verified": true` and fill
  in `ROSTER.md`'s `Total (live)` numbers.
- There are CI workflows built for this too: `.github/workflows/data-backfill.yml`
  (batched backfill, self-redispatching) and `data-verify.yml` (daily accuracy
  audit). They need `ANTHROPIC_API_KEY` + a `WORKFLOW_PAT` secret. You can drive
  the backfill manually instead, which is what this handoff does.

## First steps
1. `git checkout main && git pull`
2. Confirm network: fetch the patch-notes URL above — it should return real
   content, not 403.
3. Build the authoritative champion + item lists for 7.1g from the sources,
   diff against `data/patches/7.1/*.json` to get the missing set, write it to
   `ROSTER.md`'s totals.
4. Start batching.
