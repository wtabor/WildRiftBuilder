// Source registry for the Wild Rift data pipeline.
//
// Wild Rift has no official stat API and this environment's network policy is
// allowlisted, so the importer never fetches live at build/CI time. Instead we
// commit a *raw snapshot* per source (refreshed out-of-band from a machine with
// network access) and run the pipeline against that snapshot. See
// data/sources/README.md for the refresh procedure.

export interface SourceDef {
  /** Stable key used for the committed snapshot filename. */
  id: string;
  /** Human description of what this source provides. */
  provides: string;
  /** Where to fetch a fresh snapshot from (used out-of-band, not at CI time). */
  url: string;
  license: string;
  /** Committed snapshot path, relative to the repo root. */
  snapshot: string;
}

export const SOURCES: SourceDef[] = [
  {
    id: "ry2x",
    provides:
      "Champion metadata (id, name, title, classes, lanes, Wild Rift availability, difficulty/damage/survive/utility ratings). Merged from Riot Data Dragon + the CN Wild Rift API.",
    url: "https://ry2x.github.io/WildRift-Merged-Champion-Data/data_en_US.json",
    license: "MIT",
    snapshot: "data/sources/raw/ry2x.sample.json",
  },
];
