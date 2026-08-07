# Roster coverage

Tracks how much of the live Wild Rift roster is in the app. The
**Roster Backfill** workflow (`.github/workflows/data-backfill.yml`) updates
this as it adds entities; the **Data Accuracy Verify** workflow
(`.github/workflows/data-verify.yml`) keeps the shipped values correct.

| Category   | Entries | Total (live) | Status                       |
| ---------- | ------- | ------------ | ---------------------------- |
| Champions  | 140     | 140+         | stats/roles/titles/abilities done; Yunara added for 7.2, Cho'Gath not yet confirmed live (see below) |
| Items      | 108     | 108          | patch 7.2 enchant→item migration + item sweep done; roster complete (see follow-up investigation below — the items once thought missing turned out not to belong in the catalog) |

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
- **abilities** — ✅ all 139 (695 abilities, 5 slots each: passive/Q/W/E/R).
  Extracted verbatim from the official WR wiki per-champion pages and
  cross-checked against wildriftfire (see `tools/data-fill/`). The full stat
  re-audit in the same pass produced **0 corrections** (existing stats confirmed
  accurate). Notes:
  - **PC-data contamination found & corrected** on ~14 wiki pages (5-rank
    arrays / PC scalings): bard, pantheon, ziggs, zilean (cooldown-only),
    velkoz, kogmaw, taliyah, ksante, ekko, lee-sin (E), nidalee (Q/W), jayce,
    rell — these used wildriftfire (WR-native) values. yuumi.Q is a genuine
    5-rank WR ability (both sources agree).
  - **Form/transform champs** (gnar, jayce, khazix, lee-sin, nidalee,
    heimerdinger, shyvana, riven, senna, sion, skarner, swain, ambessa,
    camille, fizz, rell, zeri, aurelion-sol) map the **primary form's** 5
    slots; secondary-form abilities are dropped (schema has 5 slots).
  - **Lossy by schema design:** `scalings` models only AP/AD/health ratios, so
    armor/MR/% bonus-health scalings live in `description` text only. Per-rank
    scaling ratios are stored as the rank-1 value. DoT/charge abilities store
    the per-tick / minimum (base) value. A few unconfirmable fields are left
    empty rather than guessed (e.g. kog'maw R Living Artillery base damage).

## Patch 7.2 (2026-07-09)

One of the largest updates yet: the boot-enchantment mechanic was removed
entirely, boots got a new Tier-3 tier, ~30 mage/support/general items were
reworked, two champions were slated for release, and ~14 existing champions
got balance changes. See `data/patches/7.2/meta.json` for full sources;
`verified: false` there because the official WR wiki hadn't finished
publishing 7.2 numbers as of this update (values are sourced from official
patch notes + community cross-checks — re-verify once the wiki catches up).

- **Champions**: re-verified stats/abilities for the 14 named champions
  (Zyra, Annie, Yasuo, K'Sante, Kai'Sa, Kayn, Norra, Syndra, Orianna,
  Fiddlesticks, Varus, Zed, Darius, Lee Sin) against official patch notes;
  most changes are to fields this schema doesn't model numerically (range,
  duration, stack count) and landed as description-text updates rather than
  `baseDamage`/`scalings`/`cooldown` edits — only Zed's R cooldown and Lee
  Sin's Q/W numbers are real structured-field changes.
- **Yunara** (Marksman) added — confirmed released 2026-07-09. Her base stats
  and ability kit are sourced from wr-meta.com / wildriftfire since the
  official WR wiki page was still an unpopulated stub as of this update
  (`stats: 0+0` placeholder); flag for re-verification once the wiki fills
  in. One unresolved discrepancy: wildriftfire reported base attack speed
  0.77, wr-meta reported 0.75 (used, since it was the only source with a full
  growth table). **Re-checked one day later (still 2026-07-10 in this
  timeline): the official wiki page is still an unpopulated stub** — nothing
  new to re-verify against yet. A WebSearch aggregate leaned toward 0.77, but
  that's not an independent fetch (same underlying secondary sources), so the
  stored value (0.75) was left as-is rather than flipped on weak signal.
- **Cho'Gath** was **not** added. Several secondary outlets (techtimes,
  lootbar, nerdschalk, gamingonphone) reported him releasing alongside
  Yunara, but the official WR wiki has no page for him (404) and the official
  "Champion Release Update" article names only Yunara for 7.2, pointing to
  patch 7.3 for the next roadmap wave — wildriftfire's own Cho'Gath guide
  still shows "Coming Soon" / TBD tier placeholders. Treated as not yet live;
  re-check before adding.
- **Boot enchantments removed.** The 10 former enchant items
  (`goredrinker`, `stridebreaker`, `galeforce`, `gargoyle`→`gargoyle-stoneplate`,
  `stasis`→`zhonyas-hourglass`, `quicksilver`→`quicksilver-sash`,
  `protobelt`→`hextech-rocketbelt`) are now ordinary `slot: "item"` entries
  with real stats, competing for the normal 6 item slots like anything else.
  `dream-maker`, `glorious`, and `veil` were removed outright (confirmed by
  the official rework announcement + wildriftfire). The `"enchant"`
  `ItemSchema.slot` value is kept **only** so the frozen `data/patches/7.1/`
  snapshot stays schema-valid — no patch from 7.2 onward should use it.
- **New items**: Mercurial Scimitar, Blackfire Torch, Void Amethyst, Verdant
  Barrier, Dusk and Dawn, Locket of the Iron Solari, Shurelya's Battlesong,
  Banshee's Veil, and 7 new Tier-3 boots (final upgrades of each Tier-2 boot,
  unlockable after 10:00 in a live match — modeled as ordinary purchasable
  items since this calculator has no game-clock concept to gate them with).
- **Removed items**: Bandle Fantasy, Psychic Projector, Crown of the
  Shattered Queen, Awakened Soulstealer (confirmed by the official patch
  notes' explicit removal list; Prophet's Pendant and Sapphire Crystal were
  also named as removed but were never in this catalog to begin with).
- **Swept for stat/cost changes**: Redemption (full rework), Staff of Flowing
  Waters, Harmonic Echo, Ardent Censer, Imperial Mandate, Frozen Heart,
  Guardian Angel, Sterak's Gage/Maw of Malmortius/Mantle of the Twelfth Hour
  (Lifeline cooldown), Edge of Night, Blade of the Ruined King, Sunfire Aegis,
  Thornmail, Serylda's Grudge, Essence Reaver, Rod of Ages, Liandry's
  Torment, Cosmic Drive, Riftmaker, Archangel's Staff, Rabadon's Deathcap,
  Luden's Echo, Malignance, and the five Tier-2 boots priced up to 1200g
  (Gluttonous Greaves / Ionian Boots of Lucidity to 1000g).

### Follow-up: provenance tooltips ported to AerStrike + backfilled for 7.2

The provenance-tooltip feature (hover a stat/cost to see which patch it last
changed in, linking the patch notes) existed only in the deprecated Meta
design — it was never ported to AerStrike, the shipped default, so the app's
core differentiator (traceable, sourced data) was invisible in production.
Fixed:

- Ported `ProvenanceTooltip` to `src/designs/aerstrike/` and wired it into
  the item shop (cost + stat lines) and both stat panels (single + A/B
  compare).
- **Backfilled provenance stamps for every item touched in the 7.2 sweep
  above**, by diffing `data/patches/7.1/items.json` against `7.2` field-by-
  field rather than relying on memory of what changed — e.g. Blade of the
  Ruined King's Attack Damage (25→40) is now stamped `"7.2"` and its tooltip
  links straight to the official patch notes. None of this had been stamped
  when the sweep originally landed.
- Fixed a real accuracy bug this surfaced: `provenanceFor()` falls back to
  `CURRENT_PATCH` for any value with no explicit stamp (by design — a "still
  accurate as of this patch" default, not a change record). The tooltip
  wording didn't distinguish the two cases, so **every unstamped value**
  (e.g. Infinity Edge's cost, never touched this patch) was claiming "Last
  changed: Patch 7.2" — false. Tooltip now checks for an explicit stamp and
  says "No change on record — accurate as of Patch 7.2" for the fallback
  case instead of overclaiming a specific patch. Applies to both designs.

### Follow-up: the "missing items" from the initial 7.2 pass weren't gaps

An initial pass flagged Lost Chapter, Haunting Guise, Stormsurge, Void Staff,
Tear of the Goddess, Ring of Revelation, and Seraph's Embrace as roster gaps
(mentioned in the 7.2 patch notes but absent from this catalog). Direct
per-item wiki lookups reversed that:

- **Void Staff** was removed from Wild Rift entirely in patch V4.4 (years
  before 7.x) — it doesn't exist to add.
- **Lost Chapter**, **Haunting Guise**, **Tear of the Goddess**, **Ring of
  Revelation** are bare component items with no passive of their own (their
  old unique passives — "Insight", "Madness" — were removed in patches
  V4.4/V3.4). They're correctly excluded by the same design that already
  excludes every other pure component (Amplifying Tome, Ruby Crystal, etc.
  aren't in the catalog either) — not gaps. **wildriftfire had claimed these
  gained new "Enlighten"/"Madness" passives in 7.2; the official wiki
  contradicts that outright — a second instance in this patch's work of
  wildriftfire fabricating a specific-sounding number/mechanic the primary
  source doesn't back up** (the first was Lee Sin's R "Dragon's Rage",
  caught the same way). Treat wildriftfire deltas with extra skepticism when
  they can't be cross-checked against the official wiki.
- **Seraph's Embrace** is already represented implicitly: Archangel's
  Staff's own effect text says "Transforms into Seraph's Embrace at +700
  mana," matching how this catalog already avoids double-modeling transform
  items as separate entries.
- **Stormsurge**: the wiki fetch returned an implausible cost (3,988g, not a
  round WR price) and a mechanic ("Stormraider"/lightning-strike burst) that
  matches neither of the two other sources checked — looks like a
  hallucinated or wrong-page fetch. Couldn't get a reliable verified stat
  block; left unadded rather than guessed. Revisit with a cleaner source if
  this item's absence turns out to matter.

### Provenance completeness audit (bounded, patch 7.2 follow-up)

Follow-up to the item-provenance backfill above: same gap (values that changed
in some patch but were never stamped, so `provenanceFor()` silently falls back
to "accurate as of current patch") checked for champions, plus a plausibility
spot-check of stamps already on the books. Scoped as a bounded audit, not a
full re-verification — see limits at the end.

**1. Registry vs. real snapshots.** `data/patches/registry.json` lists 10
patches (7.0c, 7.0d, 7.0f, 7.1, 7.1b, 7.1d, 7.1e, 7.1f, 7.1g, 7.2), but only
`data/patches/7.1/` and `data/patches/7.2/` exist as real data directories —
confirmed with `ls data/patches/`. The other 8 are registry-only entries (date
+ official patch-notes URL), used solely so `provenanceFor()` can resolve a
link for values already stamped with those versions. **A full historical diff
chain (7.0c→7.0d→7.0f→7.1) is not reconstructable from data alone** — there's
no snapshot for any of those four, so nothing to mechanically diff. This is a
hard limitation of the two-snapshot setup, not something this audit could
close.

**2. Champion `stats` diff, 7.1 → 7.2.** Field-by-field diff (Python,
`json.load` + dict compare) of `stats` (attackDamage, attackSpeed, armor,
magicResist, maxHealth, healthRegen, mana, manaRegen, moveSpeed,
critDamageBase — both `base` and `perLevel` where applicable) across all 139
champions shared between `data/patches/7.1/champions.json` and
`data/patches/7.2/champions.json` (Yunara is 7.2-only, skipped — no 7.1
baseline). **Result: zero diffs**, confirmed both key-by-key and via
whole-object (`champ71['stats'] == champ72['stats']`) comparison. Matches
expectation — this session's 7.2 work touched abilities/descriptions for 14
named champions, not raw stat blocks. Nothing to stamp.

**3. Spot-check of 9 pre-existing stamps** (all older than 7.1g), each
checked against the official patch notes for the claimed patch
(`wildrift.leagueoflegends.com/.../wild-rift-patch-notes-<version>/`), 1–2
lookups each, ~16 total web calls:

| Champion | Stat | Stamp | Stored value | Patch notes say | Verdict |
| --- | --- | --- | --- | --- | --- |
| corki | attackDamage | 7.1 | base 54 | "Attack Damage: 50 → 54" | matches |
| jax | armor | 7.1b | perLevel 4.5 | armor growth "3.9 → 4.5" | matches |
| katarina | armor | 7.0c | base 34 | "base armor... 30 to 34" | matches |
| kayle | attackDamage, manaRegen | 7.1f | base 54 AD, base 16 MR | AD "50→54", mana regen "12→16" | matches |
| rell | armor, attackDamage | 7.0d | base 46 armor, base 62 AD | "Base Armor: 40→46", "Base Attack Damage: 58→62" | matches |
| renekton | attackDamage | 7.1b | base 66 | "Attack Damage: 70 → 66" | matches |
| ryze | attackDamage | 7.1e | base 54 | "Base Attack Damage: 58 → 54" | matches |
| shyvana | attackDamage | 7.1e | base 62 | "Base Attack Damage: 58 → 62" | matches |
| **ashe** | **maxHealth** | **7.0c** | **base 610** | **"Base Health: 600 → 630"** | **mismatch — see below** |

8 of 9 clean. **Ashe is a real find, but it's a stat-value bug, not a
provenance-stamp bug:** patch 7.0c genuinely did touch Ashe's `maxHealth` (so
the *stamp* `"7.0c"` is plausible/correct), confirmed against two independent
sources — the official 7.0c patch notes text ("Base Health: 600 → 630") and
the current `wildriftfire.com/guide/ashe` stat block ("Level 1 Ashe Stats:
Health 630"). Neither 7.0d, 7.0f, nor 7.1 patch notes mention Ashe at all, so
there's no documented patch that reverted her back down. Yet both the 7.1
and 7.2 snapshots in this repo store `maxHealth.base: 610` — 20 below what
every available source says it should be. This predates the 7.2 work (it's
already wrong in 7.1) and isn't a provenance gap; it's an existing data-value
error that happens to have been surfaced by this spot-check.
**Fixed as a follow-up**: `maxHealth.base` corrected 610 → 630 in both
`data/patches/7.1/champions.json` and `data/patches/7.2/champions.json`,
re-confirmed directly against the official 7.0c patch notes ("Base Health:
600 → 630") before writing. The existing `"7.0c"` provenance stamp was
already correct and needed no change — this was a stat-value bug, not a
provenance-stamp bug. Full gate (validate-data/typecheck/test) green after
the fix.

One correction to the search process itself: the initial (non-primary-source)
web search summary for Corki claimed attack-damage *growth* also changed
("3.6 → 4" in patch 7.1) — re-checking against the actual fetched patch-notes
page showed **no such change is mentioned**, only the base-AD change already
stamped. Search-engine summaries synthesized answers that weren't always
backed by the primary text; every finding above was confirmed against a
direct fetch of the official patch-notes page (or, for Ashe, two independent
direct fetches) before being reported as a match or a mismatch.

**What remains genuinely unverifiable given the two-snapshot limit:** any
stat/cost stamped with 7.0c, 7.0d, 7.0f, 7.1b, 7.1d, 7.1e, or 7.1f that
*wasn't* in this 9-item sample. Confirming those would require re-deriving
values from patch-notes prose one-by-one (as done here), not diffing —
there's no snapshot to diff against for those versions. Recommend treating
this as done for now (this pass covered the cheap mechanical check in full,
plus a representative spot-check) and only opening a dedicated full-history
verification session if a specific older-patch stamp is called into question
again.

## Patch 7.2a (2026-07-15) — PARTIAL roll

Rolled forward from 7.2. The official notes document 18 changes; **4 were
representable in the current schema and were applied**. The rest are recorded
here rather than silently dropped.

Sources: [Riot 7.2a notes](https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-7-2a/)
· [changelog.gg](https://changelog.gg/games/wild-rift/updates/2026-07-15-wild-rift-patch-notes-7-2a-10a16fe61cc11d1e)

### Applied

| Entity | Change | Note |
| --- | --- | --- |
| Skarner | W `Seismic Bastion` cooldown `9/8/7/6` → `8/7/6/5` | |
| Skarner | E `Ixtal's Impact` cooldown `20/18/16/14` → `18/16/14/12` | |
| Armorcrusher Boots | `attackDamage` `25` → `20` | provenance stamped `7.2a` |
| Armorcrusher Boots | `lethality` `12` → `10` | "Armor Penetration" in the notes; stamped `7.2a` |

Description-only edits (no engine effect): Manamune `Mana Charge` +18 → +14
mana per stack; Blade of the Ruined King `Ruined Strikes` melee 10% → 8.5%.
BotRK's `mechanic.currentHealthPct` models the **ranged** 7% value, which the
patch did not change, so the mechanic is untouched.

### Not applied — schema does not model the mechanic

| Entity | Change | Why not |
| --- | --- | --- |
| Nidalee | Pounce base damage `65/100/135/170` → `55/90/125/160` | W models Bushwhack (human form) only; cougar-form values are not represented |
| Nidalee | Aspect of the Cougar bonus Armor/MR AP ratio `3%` → `2.5%` | R has no `scalings`; passive stat-conversion is not modelled |
| Warwick | Eternal Hunger bonus AD ratio `20%` → `15%` | passive has no `scalings` |
| Warwick | Jaws of the Beast `90%` → `85%` AP | Q has no AP scaling modelled |
| Skarner | Q max-health damage `10%` → `11%` | max-health damage not modelled |
| Skarner | W shield ratio `8%` → `10%` max health | shields not modelled |
| Senna | Absolution current-health damage `1.2–12%` → `1–10%` | passive not modelled |
| Senna | R shield `40% AP + 4/stack` → `50% AP + 2.5/stack` | shields not modelled |
| Yuumi | E `Zoomies` mana cost `80/90/100/110` → `65/75/85/95` | ability schema has no mana-cost field |
| Yuumi | R `Final Chapter` base healing `20/30/40` → `20/35/50` | healing not modelled |

### Not applied — item absent from the dataset

`Tear of the Goddess` (mana/stack 6 → 5), `Seraph's Embrace` (Lifeline shield
20% → 16%), and `Muramana` (Shock AD ratio 6% → 4.5%) have **no record in
`items.json`** (108 items; `Archangel's Staff` is present, the Tear line is
not). This is a roster gap, not a 7.2a regression — it predates this patch.

### Discrepancy noted

changelog.gg's 7.2a summary lists only ARAM adjustments for Skarner and does
not corroborate the two cooldown changes. The official Riot notes do list
them, so the primary source was used per the source-priority rule. Worth a
re-check against the wiki once it catches up.

## Patch 7.2b (2026-07-29) — PARTIAL roll

Rolled forward from 7.2a. The official notes document 24 changes; **14 were
representable and applied**. Unlike 7.2a, **every applied value was confirmed
against both sources with no discrepancies**.

Sources: [Riot 7.2b notes](https://wildrift.leagueoflegends.com/en-us/news/game-updates/wild-rift-patch-notes-7-2b/)
· [WildRiftFire](https://www.wildriftfire.com/patch-notes)

### Applied — champions

| Champion | Change | Provenance |
| --- | --- | --- |
| Jayce | base `armor` `46` → `37` | `7.2b` |
| Nidalee | base `armor` `46` → `37` | `7.2b` |
| Nidalee | base `magicResist` `40` → `36` | `7.2b` |
| Aurora | Q `Twofold Hex` damage `35/65/95/125` → `40/70/100/130` | — |
| Aurora | Q `Twofold Hex` AP ratio `0.30` → `0.33` | — |
| Aurora | E `The Weirding` damage `75/125/175/225` → `80/130/180/230` | — |
| Sona | R `Crescendo` cooldown `80/70/60` → `80/75/70` | — |
| Kayle | Q `Radiant Blast` damage `70/120/170/220` → `60/100/140/180` | — |
| Zilean | Q `Time Bomb` damage `70/140/210/280` → `60/125/190/255` | — |
| Zilean | R `Chronoshift` cooldown `100/85/70` → `110/95/80` | — |

Provenance stamps apply to `stats`/`cost` only, per CLAUDE.md; ability values
are not stamped.

### Applied — items

| Item | Change | Provenance |
| --- | --- | --- |
| Iceborn Gauntlet | `cost` `3100` → `3000` | `7.2b` |
| Iceborn Gauntlet | `maxHealth` `250` → `300` | `7.2b` |
| Magnetic Blaster | `attackDamage` `25` → `30` | `7.2b` |
| Navori Quickblades | `cost` `2800` → `2700` | `7.2b` |

Description-only edit (no engine effect): Luden's Echo `Discordic Echo`
`110 (+10% AP)` → `140 (+15% AP)`, cooldown 10s → 9s.

### Not applied — schema does not model the mechanic

| Entity | Change | Why not |
| --- | --- | --- |
| Nidalee | Prowl brush + marked-enemy move speed `15%` → `10%` | passive move-speed effects not modelled |
| Ambessa | Public Execution damage reduction `30/40/50%` → `10/20/30%` | damage reduction not modelled |
| Ambessa | Public Execution damage from health lost `20/30/40%` → `10/17.5/25%` | %-health-lost scaling not modelled |
| Sona | Aria of Perseverance heal `45/60/75/90` → `35/50/65/80` | heals not modelled |
| Ekko | Z-Drive Resonance AP ratio `70%` → `80%` | passive has no `scalings` |
| Ekko | Parallel Convergence missing-health `2%+0.015% AP` → `3%+0.025% AP` | %-missing-health not modelled |
| Kayle | Radiant Blast mana cost `80/85/90/95` → `70/80/90/100` | ability schema has no mana-cost field |
| Kayle | Celestial Blessing mana cost + heal | same; heals not modelled |
| Hecarim | Rampage bonus move speed on hit `30%` → `18%` | passive move-speed not modelled |
| Lee Sin | Safeguard shield `80/140/200/260` → `100/160/220/280`, omnivamp `16–40%` → `20–50%` | shields and omnivamp not modelled |

### Not applied — missing entity or missing data file

- **Lord Dominik's Regards** (`attackDamage` 25 → 30) has **no record in
  `items.json`**. Same class of gap as the 7.2a Tear line.
- **Botanist rune** (plant gold 30 → 10) — there is no runes data file at all.
- **Champion bounty system** (bounty gold rates) — no data file; not modelled.
