# Roster coverage

Tracks how much of the live Wild Rift roster is in the app. The
**Roster Backfill** workflow (`.github/workflows/data-backfill.yml`) updates
this as it adds entities; the **Data Accuracy Verify** workflow
(`.github/workflows/data-verify.yml`) keeps the shipped values correct.

| Category   | Entries | Total (live) | Status                       |
| ---------- | ------- | ------------ | ---------------------------- |
| Champions  | 140     | 140+         | stats/roles/titles/abilities done; Yunara added for 7.2, Cho'Gath not yet confirmed live (see below) |
| Items      | 108     | 108+         | patch 7.2 enchant→item migration + item sweep done; a handful of pre-existing PC/WR items (Lost Chapter, Haunting Guise, Stormsurge, Void Staff, Tear of the Goddess, Ring of Revelation, Seraph's Embrace) are still missing from the catalog — unrelated roster gaps, not part of the 7.2 patch itself |

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
  growth table).
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
