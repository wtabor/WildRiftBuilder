---
name: add-entity
description: Add or update a Wild Rift champion or item in the patch dataset with verified, schema-valid, sourced data. Use when the user wants to add/update a champion or item, fill a roster gap, or correct stats for a patch.
disable-model-invocation: true
---

# Add a champion or item

Add (or correct) one champion or item in `data/patches/<patch>/` with **verified, schema-valid,
sourced** data. Accuracy is the product's whole point — never guess a number.

`$ARGUMENTS` is the entity to add, e.g. `item Youmuu's Ghostblade` or `champion Jinx`.

## Steps

1. **Pick the target patch.** Default to the newest dir under `data/patches/` (currently `7.2`).
   Confirm with the user if ambiguous. The file is `champions.json` or `items.json` in that dir.

2. **Check it doesn't already exist.** Grep the file for the `id`/`name`. If it exists and this is a
   correction, edit in place rather than appending a duplicate.

3. **Look up verified values** in source-priority order (see `CLAUDE.md`):
   1. Official Riot Wild Rift patch notes (`wildrift.leagueoflegends.com`) — primary.
   2. `riftgg.app/items`, `wildriftfire.com`.
   Cross-check ≥2 sources per value when possible. **NEVER copy from PC League / Data Dragon** —
   Wild Rift values differ. Record which source confirmed each value.

4. **Build the entry** to match the Zod schema (`src/lib/schema/index.ts` — the source of truth).
   Shapes below; omit optional fields you can't verify rather than inventing them.

   **Item:**
   ```json
   {
     "id": "kebab-case-id",
     "name": "Display Name",
     "cost": 3000,
     "tags": ["AD", "Crit"],
     "slot": "item",                      // "item" | "boots" | "enchant"
     "stats": { "attackDamage": 55, "critChance": 0.25 },
     "effects": [
       {
         "name": "Passive Name",
         "kind": "passive",               // "passive" | "active"
         "description": "Exact in-game wording.",
         "mechanic": { "kind": "crit", "critDamageBonus": 0.3 }   // optional; only if it maps to a combat mechanic
       }
     ],
     "icon": "3031"                        // optional
   }
   ```
   `mechanic.kind` is one of `onHit` | `crit` | `pen` | `shred` (see `OnHitMechanicSchema` etc. in the
   schema). If an effect doesn't map cleanly, leave it as `description` only — the engine ignores
   unrecognized effects, so don't force a mechanic.

   **Champion:** `stats` are `{ base, perLevel }` growth pairs (except `moveSpeed` flat and
   `critDamageBase`). Ability `scalings` are ratios against a stat (e.g. `0.6 AP`).
   ```json
   {
     "id": "kebab-id", "name": "Name", "title": "the Title",
     "roles": ["Marksman"], "resourceType": "mana",   // "mana" | "energy" | "none"
     "stats": {
       "attackDamage": { "base": 59, "perLevel": 3 },
       "attackSpeed":  { "base": 0.658, "perLevel": 0.0333 },  // base = base AS, perLevel = AS growth ratio
       "armor": { "base": 26, "perLevel": 3.4 },
       "magicResist": { "base": 30, "perLevel": 1.3 },
       "maxHealth": { "base": 610, "perLevel": 100 },
       "healthRegen": { "base": 3.5, "perLevel": 0.55 },
       "mana": { "base": 280, "perLevel": 32 },
       "manaRegen": { "base": 6.97, "perLevel": 0.4 },
       "moveSpeed": 325,
       "critDamageBase": 0.75
     },
     "abilities": [
       { "slot": "R", "name": "Ult", "description": "...", "baseDamage": [200,400,600],
         "damageType": "magic", "scalings": [{ "stat": "abilityPower", "ratio": 1 }], "cooldown": [100,80,60] }
     ],
     "icon": "Ashe"   // Data Dragon key for portrait art (e.g. "MonkeyKing" for Wukong)
   }
   ```

5. **Insert** the entry into the array (alphabetical-ish by name is fine; match the file's existing style).

6. **Stamp per-value provenance — mandatory, not optional, whenever you change a `stats`/`cost`
   value on an entity that already existed.** `ChampionSchema` and `ItemSchema` both carry an
   optional `provenance: Record<string, string>` field (see `ProvenanceSchema` in
   `src/lib/schema/index.ts`): a sparse map from a `stats` key (or `"cost"`) to the patch string in
   which that value last changed. The `ProvenanceTooltip` UI reads it to show "Last changed: Patch
   X" on hover — if you change a number without stamping it, the tooltip silently lies (it'll either
   show a stale patch or, worse, claim "no change on record").

   **Rule:** if this edit adds or changes a `stats`-block value or `cost` on a champion/item that
   already existed in a prior patch, you MUST set `provenance[<key>] = "<patch>"` on that same
   object, in the same edit, using the exact patch dir string you're editing (e.g. `"7.2"`). Stamp
   *every* key you touch, not just the one the patch notes headline. This is not a step to batch up
   and do later or reconstruct from a diff afterward — do it inline, value by value, as you write
   each change. Do not move on to step 7 with an unstamped changed value.

   Concrete example — Blade of the Ruined King's Attack Damage went 25 → 40 in patch 7.2:
   ```jsonc
   // data/patches/7.1/items.json (previous patch, no provenance needed — it's the baseline there)
   { "id": "blade-of-the-ruined-king", "stats": { "attackDamage": 25, "attackSpeed": 0.35 } }

   // data/patches/7.2/items.json (this patch) — value changed, so stamp the key you changed
   {
     "id": "blade-of-the-ruined-king",
     "stats": { "attackDamage": 40, "attackSpeed": 0.35 },
     "provenance": { "attackDamage": "7.2" }
   }
   ```
   Changing `cost` in the same pass? Stamp both: `"provenance": { "attackDamage": "7.2", "cost": "7.2" }`.

   **Exception — brand-new entities only.** If this is the first patch an entity appears in at all
   (a new champion/item, not a correction to something pre-existing), do NOT add provenance stamps
   for it. `provenanceFor()` (`src/lib/data/index.ts`) already falls back to the dataset's
   `CURRENT_PATCH` for any key with no explicit stamp, so a new entity's values correctly read as
   "current as of this patch" with zero stamps — adding them would be redundant. The stamping rule
   above applies only to *changes to values that existed in an earlier patch dir*.

   Separately, also update the patch's `meta.json` `sources` array with the URLs you verified
   against, and set `verified: true` only if the *whole* file is verified against a primary source —
   don't flip it for a single addition.

7. **Gate.** Run and ensure both pass (the edit also triggers the validate-data hook automatically):
   ```bash
   npm run validate-data
   npm run typecheck
   ```
   Fix until green. If a required source is unreachable, do NOT guess — report which values you
   couldn't verify and leave them out.

8. **Report** what you added as `field: old -> new (source URL)` for each changed value (or `field:
   value (source URL)` for a new entity), and confirm which of those fields got a `provenance` stamp
   in step 6, so the user can spot-check both the value and the stamp.

Do not commit or open a PR unless the user asks.
