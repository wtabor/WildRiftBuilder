# Data sources & the hybrid pipeline

Wild Rift has **no official stat API**, and the data that does exist (ddragon)
describes *PC* League, not Wild Rift. So this project uses a **hybrid pipeline**:

```
scraped source snapshot ──(adapter)──> champion metadata ─┐
                                                          ├─(merge)─> data/patches/<patch>/
hand-verified overrides  ─────────────────────────────────┘
```

- **Scrape** gives us breadth: champion names, titles, roles, and Wild-Rift
  availability (`data/sources/raw/*.json`).
- **Hand-verify** gives us correctness: the per-level stats and ability numbers
  that every existing tool gets wrong (`data/overrides/*.json`).
- A champion is only shipped when it's in Wild Rift **and** has a hand-verified
  override — so we never publish placeholder numbers.

Run it with:

```bash
npm run build-data        # regenerates data/patches/7.1/{champions,items,meta}.json
npm run validate-data     # schema-checks the result
```

## Why snapshots instead of live fetches

The CI and cloud environments are **network-allowlisted**, so the importer can't
hit arbitrary source hosts at build time. Instead we commit a **raw snapshot**
per source and run the pipeline against it. Refresh snapshots out-of-band from a
machine with network access:

| Source | Provides | Snapshot | Refresh from |
|---|---|---|---|
| ry2x merged champion data (MIT) | Canonical roster + WR availability + ratings | `raw/ry2x.sample.json` | https://ry2x.github.io/WildRift-Merged-Champion-Data/data_en_US.json |
| **Riot Wild Rift website (official)** | Titles, roles, art — **metadata only, no stats** | `raw/riot-wr.sample.json` | https://wildrift.leagueoflegends.com/en-us/champions/ |

### On official Riot data

Riot has **no Data Dragon and no public stat API for Wild Rift** — Data Dragon is
PC League only. The only official Riot source for Wild Rift is the website content
above, which gives names/roles/ability text/art but **not** per-level base stats or
item stat tables. So the official source enriches metadata/art while the
**hand-verified overrides remain the only source of the numbers**. ry2x stays the
canonical roster (it carries WR availability); Riot enriches matching champions and
Riot-only entries are ignored.

> The committed `ry2x.sample.json` is a **representative sample** in the source's
> shape, not a full pull — replace it with a real snapshot when refreshing.

## Verification status

Each override entry has a `verified` flag. `build-data` flips a patch's
`meta.json` `verified` to `true` only when **every** emitted champion is
verified. Until then the app shows a "sample data" badge. Set `verified: true`
on an override entry once its numbers are checked against in-game values.
