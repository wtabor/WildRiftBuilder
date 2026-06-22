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

1. **Pick the target patch.** Default to the newest dir under `data/patches/` (currently `7.1`).
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

6. **Stamp provenance.** Update the patch's `meta.json` `sources` array with the URLs you verified
   against. Set `verified: true` only if the *whole* file is verified against a primary source — don't
   flip it for a single addition.

7. **Gate.** Run and ensure both pass (the edit also triggers the validate-data hook automatically):
   ```bash
   npm run validate-data
   npm run typecheck
   ```
   Fix until green. If a required source is unreachable, do NOT guess — report which values you
   couldn't verify and leave them out.

8. **Report** what you added as `field: value (source URL)` for each value, so the user can spot-check.

Do not commit or open a PR unless the user asks.
