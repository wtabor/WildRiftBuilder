"use client";

import Link from "next/link";
import { useState } from "react";
import { DESIGNS } from "@/designs/registry";
import { ChevronRightIcon } from "@/lib/icons";

/**
 * A neutral, theme-agnostic meta-control for jumping between designs (and back
 * to the gallery) without losing the current build — `query` carries the
 * encoded build state across the navigation. Deliberately styled the same in
 * every design so it reads as "chrome", not part of the design under review.
 */
export function DesignSwitcher({ current, query }: { current: string; query: string }) {
  const [open, setOpen] = useState(false);
  const suffix = query ? `?${query}` : "";
  const currentName = DESIGNS.find((d) => d.id === current)?.name ?? "Design";

  return (
    <div className="relative z-50 font-sans text-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-white/90 backdrop-blur-md transition hover:border-white/30 hover:bg-black/70"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="font-medium">{currentName}</span>
        <span className="text-white/40">·</span>
        <span className="text-white/60">switch</span>
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-64 animate-pop-in overflow-hidden rounded-xl border border-white/12 bg-[#0b0f1a]/95 p-1.5 shadow-2xl backdrop-blur-xl"
          >
            {DESIGNS.map((d) => (
              <Link
                key={d.id}
                href={`/designs/${d.id}${suffix}`}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 transition ${
                  d.id === current ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${d.accent}, ${d.accent2})` }}
                  />
                  <span className="font-medium">{d.name}</span>
                </span>
                <span className="text-xs text-white/40">{d.id === current ? "current" : ""}</span>
              </Link>
            ))}
            <Link
              href={`/${suffix}`}
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-between rounded-lg border-t border-white/10 px-3 py-2 text-white/60 transition hover:bg-white/5"
            >
              <span>All designs</span>
              <ChevronRightIcon width={16} height={16} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
