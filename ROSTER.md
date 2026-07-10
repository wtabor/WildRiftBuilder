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
