"use client";

import type { Item } from "@/lib/schema";
import { formatGold } from "@/lib/format";

export function BuildBar({
  items,
  maxItems,
  goldCost,
  onRemove,
  onClear,
}: {
  items: Item[];
  maxItems: number;
  goldCost: number;
  onRemove: (index: number) => void;
  onClear: () => void;
}) {
  const slots = Array.from({ length: maxItems }, (_, i) => items[i] ?? null);

  return (
    <div className="rounded-lg border border-rift-border bg-rift-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rift-gold">
          Build
        </h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-rift-gold">
            {formatGold(goldCost)}g
          </span>
          <button
            onClick={onClear}
            disabled={items.length === 0}
            className="text-xs text-rift-gold2/50 hover:text-rift-tank disabled:opacity-30"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {slots.map((item, i) => (
          <div
            key={i}
            className="flex aspect-square flex-col items-center justify-center rounded-md border border-dashed border-rift-border bg-rift-bg p-1 text-center"
          >
            {item ? (
              <button
                onClick={() => onRemove(i)}
                title={`Remove ${item.name}`}
                className="flex h-full w-full flex-col items-center justify-center"
              >
                <span className="text-[10px] font-semibold leading-tight text-rift-gold2">
                  {item.name}
                </span>
                <span className="mt-0.5 text-[9px] text-rift-tank/80">remove</span>
              </button>
            ) : (
              <span className="text-2xl text-rift-border">+</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
