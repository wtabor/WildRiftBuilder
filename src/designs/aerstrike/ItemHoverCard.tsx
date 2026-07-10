"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Item } from "@/lib/schema";
import { itemStatLines } from "@/lib/statDisplay";
import { formatGold } from "@/lib/format";
import { goldEfficiency } from "@/lib/stats/engine";

/**
 * Wraps a compact trigger (an icon, a card, whatever) with a WildRiftFire-style
 * floating tooltip that reveals an item's full stats/effects/gold-efficiency on
 * hover or focus. Lets the surrounding UI stay a one-line icon+name+cost row
 * instead of an always-expanded stat block — the detail is still one hover away.
 *
 * Rendered through a portal into `document.body` (not a plain CSS :hover popover):
 * several of this component's callers — the item shop grid, in particular — sit
 * inside an `overflow-y-auto` scroll container, which would otherwise clip an
 * absolutely-positioned tooltip the moment it overflows the trigger's row.
 */
export function ItemHoverCard({
  item,
  children,
  align = "center",
}: {
  item: Item;
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  function show() {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const raw = align === "left" ? r.left : align === "right" ? r.right : r.left + r.width / 2;
    const margin = 132; // half the tooltip's own width, keeps it on-screen
    const left = Math.max(margin, Math.min(window.innerWidth - margin, raw));
    setPos({ top: r.top - 8, left });
    setOpen(true);
  }

  function hide() {
    setOpen(false);
  }

  const lines = itemStatLines(item);
  const eff = goldEfficiency(item);
  const originClass = align === "left" ? "ae-tip-panel--left" : align === "right" ? "ae-tip-panel--right" : "";

  return (
    <span ref={ref} className="block" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            className={`ae-tip-panel ${originClass}`}
            style={{ top: pos.top, left: pos.left }}
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[var(--ae-fg)]">{item.name}</span>
              <span className="ae-num shrink-0 text-xs font-semibold text-[var(--ae-accent-tertiary)]">
                {formatGold(item.cost)} G
              </span>
            </span>

            {lines.length > 0 && (
              <span className="mt-2 block space-y-1">
                {lines.map((l) => (
                  <span key={l.key} className="flex items-center gap-2 text-[11.5px] text-[var(--ae-fg-dim)]">
                    <span className="ae-num font-semibold text-[var(--ae-fg)]">+{l.display}</span>
                    <span>{l.label}</span>
                  </span>
                ))}
              </span>
            )}

            {item.effects.length > 0 && (
              <span className="mt-2 block space-y-1.5 border-t border-[var(--ae-border)] pt-2">
                {item.effects.map((e) => (
                  <span key={e.name} className="block text-[11px] leading-relaxed text-[var(--ae-fg-dim)]">
                    <span className="font-bold text-[var(--ae-fg)]">{e.name}</span> {e.description}
                  </span>
                ))}
              </span>
            )}

            {eff !== null && (
              <span
                className="ae-chip mt-2 inline-block"
                style={eff >= 1 ? { color: "var(--ae-accent-secondary)", borderColor: "var(--ae-border-strong)" } : undefined}
              >
                {Math.round(eff * 100)}% gold eff
              </span>
            )}
          </span>,
          document.body,
        )}
    </span>
  );
}
