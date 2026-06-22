# Handoff: finish the Wild Rift roster + item data

Paste this whole file as the opening prompt in a fresh **local** Claude Code
session (run from the repo root, on a branch). Local has unrestricted network,
which is the only thing the remote session was missing.

---

## Goal

Finish the dataset under `data/patches/7.1/` so the app ships the **full live
Wild Rift roster (patch 7.1g)** with **verified, schema-valid** data. Today
only 3 champions and the item set are populated; the rest are empty stubs.

**Accuracy is the product's whole differentiator. Do NOT fabricate stats.**
Every number must come from a verified source (below). If a value can't be
confirmed, leave the entity out of the batch rather than guess.

## What's already done (don't redo)

- Damage engine (`src/lib/damage/engine.ts`): auto-attack DPS, crit, on-hit,
  penetration, resist mitigation — complete and tested.
- Item combat `mechanic` data + the always-on penetration fix — complete.
- Stat engine, gold efficiency, build state, URL sharing, compare UI, target
  dummy — complete.

## What's missing (the entire remaining task)

### A. Champions — 136 of 139 are stubs
Complete today: **ashe, ahri, darius** only. Use these three as the reference
for shape/quality. Every other champion in `champions.json` has `id`/`name`/
`icon` but needs: `roles`, `resourceType`, full `stats` (base+growth for all
fields), and `abilities`.

### B. Items — 5 real items missing `stats`
`goredrinker`, `stridebreaker`, `galeforce`, `dream-maker`, `protobelt`.
(The statless boots **enchants** — `stasis, quicksilver, veil, gargoyle,
glorious` — are correct as-is; leave them.)
While adding stats, also add combat `mechanic` data to any new item with an
on-hit / crit / pen / armor-shred passive (see schema below), matching the
patterns already in the file (Terminus, Kraken, IE, etc.).

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
