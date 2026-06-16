"use client";

import { getPatchInfo } from "@/lib/data";
import { formatPatchDate } from "@/lib/format";

/**
 * Wraps a displayed value and, on hover/focus, shows which patch it last changed
 * in — "Patch 7.1g · Jun 10, 2026" — linking to that patch's notes. If the patch
 * version is unknown to the registry, the value renders plainly with no tooltip.
 */
export function ProvenanceTooltip({
  version,
  children,
}: {
  version: string | undefined;
  children: React.ReactNode;
}) {
  const info = getPatchInfo(version);
  if (!version || !info) return <>{children}</>;

  const date = formatPatchDate(info.date);
  const label = `Patch ${version}${date ? ` · ${date}` : ""}`;

  return (
    <span className="group relative inline-flex items-center" tabIndex={0}>
      <span className="cursor-help underline decoration-dotted decoration-rift-gold/40 underline-offset-2">
        {children}
      </span>
      <span
        role="tooltip"
        className="invisible absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 whitespace-nowrap rounded border border-rift-border bg-rift-bg px-2 py-1 text-xs opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
      >
        {info.url ? (
          <a
            href={info.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-rift-blue hover:underline"
          >
            {label} ↗
          </a>
        ) : (
          <span className="text-rift-gold2/80">{label}</span>
        )}
      </span>
    </span>
  );
}
