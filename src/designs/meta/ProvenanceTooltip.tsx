"use client";

import { getPatchInfo, provenanceFor } from "@/lib/data";
import { formatPatchDate } from "@/lib/format";
import type { Provenance } from "@/lib/schema";

/**
 * Wraps a displayed value and, on hover/focus, reveals which patch that value
 * last changed in — e.g. "Patch 7.2 · Jul 9, 2026".
 *
 * Deliberately non-interactive (no <a>): these tooltips render inside the item
 * shop cards, which are themselves <button>s, and nesting a link inside a button
 * is invalid. The patch label is shown as text; the notes URL is surfaced via
 * the native `title` attribute so it stays discoverable without breaking the
 * surrounding button semantics.
 *
 * Uses a *named* group (`group/prov`) so its hover state never collides with the
 * card's own `group` hover styling.
 */
export function ProvenanceTooltip({
  provenance,
  valueKey,
  children,
}: {
  provenance: Provenance | undefined;
  valueKey: string;
  children: React.ReactNode;
}) {
  const version = provenanceFor(provenance, valueKey);
  const info = getPatchInfo(version);

  const date = info ? formatPatchDate(info.date) : "";
  const label = `Patch ${version}${date ? ` · ${date}` : ""}`;

  return (
    <span
      className="group/prov relative inline-flex items-center"
      title={info?.url ? `${label} — ${info.url}` : label}
    >
      <span className="cursor-help underline decoration-dotted decoration-meta-dim/60 underline-offset-2">
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap rounded border border-meta-border bg-meta-bg2 px-2 py-1 text-[10px] font-medium text-meta-text opacity-0 shadow-lg transition group-hover/prov:visible group-hover/prov:opacity-100"
      >
        Last changed: <span className="font-semibold text-meta-blue">{label}</span>
      </span>
    </span>
  );
}
