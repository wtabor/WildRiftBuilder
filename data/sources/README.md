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

| Source | Snapshot | Refresh from |
|---|---|---|
| ry2x merged champion data (MIT) | `raw/ry2x.sample.json` | https://ry2x.github.io/WildRift-Merged-Champion-Data/data_en_US.json |

> The committed `ry2x.sample.json` is a **representative sample** in the source's
> shape, not a full pull — replace it with a real snapshot when refreshing.

## Verification status

Each override entry has a `verified` flag. `build-data` flips a patch's
`meta.json` `verified` to `true` only when **every** emitted champion is
verified. Until then the app shows a "sample data" badge. Set `verified: true`
on an override entry once its numbers are checked against in-game values.
