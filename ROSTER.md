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
  this item's absence turns out to matter. **Re-investigated 2026-07-15 —
  still unconfirmable in this environment; see below.**

#### Stormsurge re-investigation (2026-07-15) — still UNCONFIRMABLE, do not re-litigate without egress

Prompted by two new datapoints: (1) WildRiftFire's live Patch 7.2 guides
recommend Stormsurge on 8 mage champions (akali, aurora, heimerdinger,
katarina, kennen, veigar, vladimir, bard); (2) the official-wiki page
`wiki.leagueoflegends.com/en-us/WR:Stormsurge` exists but smells
PC-contaminated (cost 3988, a PC-style recipe, an "added for ARAM in V5.2a"
note). Goal was to settle definitively whether Stormsurge is purchasable in
current WR Summoner's Rift.

**Blocked before it could be settled — the tie-breaker sources are all
unreachable from this cloud runner:**

- Every WR-native host is denied by this session's **egress policy** (proxy
  answers `403` to `CONNECT`): `wildrift.leagueoflegends.com` (the primary
  source), `wr-meta.com`, `wildriftfire.com`, `riftgg.app`, `wiki.leagueoflegends.com`,
  `leagueoflegends.fandom.com` — all fail `curl` with rc 56. `web.archive.org`
  is blocked too, so archived copies of the primary source are out as well.
- `riftgg.app` also needs the **Firecrawl key from 1Password**, but the `op`
  CLI isn't installed here and `FIRECRAWL_API_KEY` is unset — a cloud runner
  can't reach 1Password (this is already documented for `scripts/daily-verify.sh`).
- The only working web channel is the Anthropic **WebSearch** tool, which
  returns AI-summarized snippets, not raw page text. This repo's own audit
  discipline (see the provenance spot-check note above: "search-engine
  summaries synthesized answers that weren't always backed by the primary
  text") requires confirming every value against a **direct fetch of the
  primary source** before trusting it — which is exactly what's impossible here.

**What the search snippets did/didn't establish:**

- *Confirmed (datapoint 1 is real):* a WildRiftFire-domain-restricted search
  confirms Stormsurge appears in WildRiftFire's Patch 7.2 build guides for
  those 8 champions. But WildRiftFire is this project's twice-documented
  fabricator of plausible-sounding numbers (Lee Sin R, the component-item
  "Enlighten/Madness" passives) — build *usage* is suggestive, not a verified
  stat block, and WildRiftFire's own item numbers can't be cross-checked
  against a primary source from here.
- *Suggestive but unverifiable:* multiple WebSearch queries attribute to the
  official 7.2 notes a **new burst-mage Stormsurge** with a "Squall" passive
  (flat magic pen; deal 25% of a target's max HP within 2.5s → inflict Squall
  + 25% MS for 2.5s, 25s cd; after 2s deal 125 + 10% AP magic damage; on kill
  splash it + grant 25 gold). This fits the real 7.2 mage-item rework the
  catalog already reflects (flat-pen consolidation; Blackfire Torch, Dusk and
  Dawn, updated Luden's Echo, Void Amethyst all shipped). *But no reachable
  source gives the two numbers an item entry needs — base **Ability Power**
  and **cost** — and the searches say so outright ("base stat details ... are
  not included").*
- *Actively contradictory:* across four searches the hard numbers never
  agreed — cost came back as 3988 (wiki/PC), 2800 (explicitly tagged the PC
  Summoner's Rift version), or absent; AP as 100 or 90; magic pen as "7%+15",
  "15 flat", or "flat/unspecified"; the max-HP trigger as 25% *or* 35%; the
  cooldown 25s *or* 30s. One summary asserted the WR version is **ARAM-only**
  while the SR version is PC-exclusive. This is the same PC-contamination +
  hallucination signature that got the item excluded originally.

**Verdict:** Do **not** add Stormsurge. There is genuine signal it may be a
real 7.2 burst-mage item (real WildRiftFire build usage + a self-consistent
Squall-passive description), but no complete, primary-source-verified stat
block (cost + AP + magic pen) can be obtained from any source reachable here,
and the readable sources contradict each other on nearly every number and on
SR-vs-ARAM availability. Adding it would mean inventing a cost/AP the moat
rules forbid guessing. The dependent follow-up (re-running the standing-builds
pipeline to rescue the 7 skipped mage champions) is therefore also **not**
run — it's contingent on a verified add, and the pipeline cache
(`~/.cache/wrb/builds-pipeline/`) isn't present on this runner anyway.

**How to actually settle this (next session, with network egress):** from an
environment that can reach the WR-native hosts — or on the local machine where
`op` + Firecrawl work — directly fetch, in priority order, (a) the official
7.2 patch notes at `wildrift.leagueoflegends.com/.../wild-rift-patch-notes-7-2/`
and confirm Stormsurge is listed as a purchasable SR item with an exact cost
and AP; (b) `riftgg.app/items` (Firecrawl) and `wr-meta.com` for a WR-native
stat block to cross-check. If ≥2 primary/WR-native sources agree on a round WR
cost and stat line, add it via `/add-entity` and then run the standing-builds
pipeline; if they still conflict or show it as ARAM-only, mark this closed as
"not an SR item" and stop revisiting.

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
