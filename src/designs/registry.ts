/**
 * The catalog of UI designs under exploration. Drives the gallery at `/` and
 * the cross-design switcher in each builder. All three are full, functional
 * builders wired to the same engine/data/state — they differ only in
 * presentation, layout, and interaction model.
 */
export interface DesignMeta {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  /** Primary accent (hex) used by the gallery card. */
  accent: string;
  accent2: string;
  /** Short list of what makes this design distinct. */
  highlights: string[];
}

export const DESIGNS: DesignMeta[] = [
  {
    id: "aurora",
    name: "Aurora",
    tagline: "Modern · premium · spacious",
    blurb:
      "A clean, glassmorphic interface in the spirit of Linear and Vercel. Drifting aurora gradients, frosted panels, and a calm three-column layout that collapses to a mobile bottom-sheet.",
    accent: "#2dd4bf",
    accent2: "#a78bfa",
    highlights: ["Frosted glass panels", "Drifting gradient backdrop", "Mobile bottom-sheet build summary"],
  },
  {
    id: "hextech",
    name: "Hextech Arsenal",
    tagline: "Immersive · in-game · dramatic",
    blurb:
      "Leans all the way into the Wild Rift fantasy: beveled hextech-gold panels, a champion splash banner, hexagon item tiles, and a HUD-style stat overlay. Feels like the in-game shop.",
    accent: "#c8aa6e",
    accent2: "#0ac8b9",
    highlights: ["Beveled gold panels", "Champion splash banner", "Hexagon item tiles + HUD stats"],
  },
  {
    id: "console",
    name: "Stat Console",
    tagline: "Dense · pro · data-first",
    blurb:
      "A power-user terminal à la statcheck.lol. A sortable item table, monospace tabular numerics, and a stat readout that shows the delta each item adds over the champion base. Everything visible at once.",
    accent: "#3fb950",
    accent2: "#58a6ff",
    highlights: ["Sortable item table", "Monospace tabular stats", "Live delta-from-base readout"],
  },
];

export function getDesign(id: string): DesignMeta | undefined {
  return DESIGNS.find((d) => d.id === id);
}
