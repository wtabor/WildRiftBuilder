# Roster coverage

Tracks how much of the live Wild Rift roster is in the app. The
**Roster Backfill** workflow (`.github/workflows/data-backfill.yml`) updates
this as it adds entities; the **Data Accuracy Verify** workflow
(`.github/workflows/data-verify.yml`) keeps the shipped values correct.

| Category   | In app | Total (live) | Status     |
| ---------- | ------ | ------------ | ---------- |
| Champions  | 3      | TBD          | backfill   |
| Items      | 10     | TBD          | backfill   |

> `Total (live)` is filled in by the backfill agent once it has built the
> authoritative list from verified sources (official Wild Rift site,
> riftgg.app, wildriftfire.com). Until then the sample dataset under
> `data/patches/7.1` is illustrative only (`meta.verified: false`).

## Currently in app (patch 7.1)

- **Champions:** ashe, ahri, darius
- **Items:** infinity-edge, bloodthirster, phantom-dancer, rabadons-deathcap,
  ludens-echo, warmogs-armor, sunfire-aegis, guardian-angel, gluttonous-greaves,
  boots-of-swiftness
