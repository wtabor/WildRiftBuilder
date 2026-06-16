"use client";

import { useMemo, useState } from "react";
import { items } from "@/lib/data";
import { goldEfficiency } from "@/lib/stats/engine";
import { STAT_META, type Item, type StatKey } from "@/lib/schema";
import { formatGold } from "@/lib/format";

/** Stat filters — the feature competing mobile apps notably lack. */
const STAT_FILTERS: { key: StatKey; label: string }[] = [
  { key: "attackDamage", label: "AD" },
  { key: "abilityPower", label: "AP" },
  { key: "attackSpeed", label: "AS" },
  { key: "critChance", label: "Crit" },
  { key: "armor", label: "Armor" },
  { key: "magicResist", label: "MR" },
  { key: "maxHealth", label: "Health" },
  { key: "abilityHaste", label: "Haste" },
];

export function ItemShop({
  onAdd,
  disabled,
}: {
  onAdd: (id: string) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<StatKey>>(new Set());

  function toggleFilter(key: StatKey) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (query && !item.name.toLowerCase().includes(query.toLowerCase())) return false;
      for (const f of activeFilters) {
        if (!item.stats[f]) return false; // AND across selected stats
      }
      return true;
    });
  }, [query, activeFilters]);

  return (
    <div className="rounded-lg border border-rift-border bg-rift-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rift-gold">
          Item Shop
        </h2>
        <span className="text-xs text-rift-gold2/50">{filtered.length} items</span>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items…"
        className="mb-3 w-full rounded border border-rift-border bg-rift-bg px-3 py-2 text-sm outline-none focus:border-rift-blue"
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {STAT_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => toggleFilter(f.key)}
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              activeFilters.has(f.key)
                ? "bg-rift-blue text-rift-bg"
                : "border border-rift-border text-rift-gold2/70 hover:border-rift-blue"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid max-h-[28rem] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.map((item) => (
          <ItemCard key={item.id} item={item} onAdd={onAdd} disabled={disabled} />
        ))}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  onAdd,
  disabled,
}: {
  item: Item;
  onAdd: (id: string) => void;
  disabled: boolean;
}) {
  const eff = goldEfficiency(item);
  const statLines = (Object.keys(item.stats) as StatKey[])
    .filter((k) => item.stats[k])
    .map((k) => {
      const meta = STAT_META[k];
      const v = item.stats[k]!;
      const display = meta.format === "percent" ? `${Math.round(v * 1000) / 10}%` : v;
      return `+${display} ${meta.label}`;
    });

  return (
    <button
      onClick={() => onAdd(item.id)}
      disabled={disabled}
      title={item.effects.map((e) => `${e.name}: ${e.description}`).join("\n")}
      className="flex flex-col rounded-md border border-rift-border bg-rift-bg p-2.5 text-left transition hover:border-rift-gold disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-rift-gold2">{item.name}</span>
        <span className="font-mono text-xs text-rift-gold">{formatGold(item.cost)}g</span>
      </div>
      <ul className="mt-1 space-y-0.5">
        {statLines.map((line) => (
          <li key={line} className="text-xs text-rift-gold2/70">
            {line}
          </li>
        ))}
      </ul>
      {eff !== null && (
        <span className="mt-1 text-xs text-rift-blue/80">
          {Math.round(eff * 100)}% gold efficient
        </span>
      )}
    </button>
  );
}
