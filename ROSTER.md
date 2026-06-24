# Roster coverage

Tracks how much of the live Wild Rift roster is in the app. The
**Roster Backfill** workflow (`.github/workflows/data-backfill.yml`) updates
this as it adds entities; the **Data Accuracy Verify** workflow
(`.github/workflows/data-verify.yml`) keeps the shipped values correct.

| Category   | Entries | Fully complete | Total (live) | Status   |
| ---------- | ------- | -------------- | ------------ | -------- |
| Champions  | 139     | 3              | 139          | backfill |
| Items      | 100     | 95             | TBD          | backfill |

> The full live champion roster (139) is present as entries, and **roles +
> resourceType are verified-filled for 135** from the ry2x CN-API feed (see
> [HANDOFF.md](./HANDOFF.md)). What remains per champion is the numeric
> payload — base+growth `stats` and `abilities` — which only ashe/ahri/darius
> have today, and which needs the verified stat-table sources (blocked on a
> GitHub-only network policy; do this in a session with broader network).
>
> Items: 100 entries, 95 with stat blocks. Still missing `stats`: **goredrinker,
> stridebreaker, galeforce, dream-maker, protobelt** (the other 5 statless
> entries are boots *enchants*, correctly statless). `Total (live)` items TBD.

## Status detail (patch 7.1)

- **Champions fully complete (stats + abilities):** ashe, ahri, darius
- **Champions with verified roles/resourceType only:** 135 others (everything
  except the 3 above and `norra`, which is absent from the feed and needs those
  two fields set manually).
- **Per-champion TODO:** base+growth `stats` (10 fields) and `abilities`.
