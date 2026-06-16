"use client";

import { useEffect, useMemo, useState } from "react";
import { champions, getChampion, getItems, items, patchMeta } from "@/lib/data";
import { computeBuild, goldEfficiency } from "@/lib/stats/engine";
import { encodeBuild, useBuildState } from "@/state/buildState";
import { STAT_META, type Item, type StatKey } from "@/lib/schema";
import { statRows, itemStatLines, GROUP_LABEL, type StatGroup, type StatRow } from "@/lib/statDisplay";
import { formatStat, formatGold } from "@/lib/format";
import { itemClass, ITEM_CLASS_COLOR } from "@/lib/visual";
import { useShare } from "@/lib/useShare";
import { DesignSwitcher } from "@/designs/shared/DesignSwitcher";
import {
  SearchIcon,
  ShareIcon,
  CheckIcon,
  XIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StatIcon,
} from "@/lib/icons";

const STAT_FILTERS: { key: StatKey; label: string }[] = [
  { key: "attackDamage", label: "AD" },
  { key: "abilityPower", label: "AP" },
  { key: "attackSpeed", label: "AS" },
  { key: "critChance", label: "Crit" },
  { key: "armor", label: "Armor" },
  { key: "magicResist", label: "MR" },
  { key: "maxHealth", label: "HP" },
  { key: "abilityHaste", label: "Haste" },
];

const GROUP_ACCENT: Record<StatGroup, string> = {
  offense: "text-con-amber",
  defense: "text-con-blue",
  utility: "text-con-accent",
};

type SortKey = "name" | "cost" | "eff";

export default function ConsoleDesign() {
  const { build, patch, setChampion, setLevel, addItem, removeItemAt, clearItems, maxItems } =
    useBuildState();

  useEffect(() => {
    document.title = "Stat Console · Wild Rift Builder";
  }, []);

  const champion = build.championId ? getChampion(build.championId) : undefined;
  const buildItems = useMemo(() => getItems(build.itemIds), [build.itemIds]);
  const totals = useMemo(
    () => (champion ? computeBuild(champion, build.level, buildItems) : null),
    [champion, build.level, buildItems],
  );
  const baseTotals = useMemo(
    () => (champion ? computeBuild(champion, build.level, []) : null),
    [champion, build.level],
  );
  const query = encodeBuild(build);
  const full = build.itemIds.length >= maxItems;

  return (
    <div className="relative min-h-screen bg-con-bg font-mono text-con-text">
      <div aria-hidden className="pointer-events-none fixed inset-0 grid-bg opacity-30" />

      <div className="relative mx-auto max-w-[88rem] px-3 pb-10 pt-3 sm:px-4">
        <Toolbar
          patch={patch}
          query={query}
          champion={champion}
          selectedId={build.championId}
          onSelect={setChampion}
          level={build.level}
          onLevel={setLevel}
        />

        {champion && totals && baseTotals ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_25rem]">
            <ItemTable onAdd={addItem} full={full} />
            <div className="space-y-3">
              <BuildStrip
                items={buildItems}
                maxItems={maxItems}
                goldCost={totals.goldCost}
                onRemove={removeItemAt}
                onClear={clearItems}
              />
              <StatReadout
                total={statRows(totals.stats, totals.attackSpeed)}
                base={statRows(baseTotals.stats, baseTotals.attackSpeed)}
              />
            </div>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

/* ── Card primitive ───────────────────────────────────────────────────── */

function Card({
  title,
  right,
  children,
  className = "",
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-con-border bg-con-panel ${className}`}>
      <div className="flex items-center justify-between border-b border-con-border px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-con-mute">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

/* ── Toolbar ──────────────────────────────────────────────────────────── */

function Toolbar({
  patch,
  query,
  champion,
  selectedId,
  onSelect,
  level,
  onLevel,
}: {
  patch: string;
  query: string;
  champion: ReturnType<typeof getChampion>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  level: number;
  onLevel: (n: number) => void;
}) {
  const { copied, copy } = useShare();
  return (
    <header className="flex flex-wrap items-center gap-2 rounded-md border border-con-border bg-con-panel px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded bg-con-accent/15 font-bold text-con-accent">
          ▮
        </span>
        <span className="text-sm font-semibold tracking-wide text-con-text">stat-console</span>
        <span className="text-con-mute">/</span>
      </div>

      {/* Champion select */}
      <label className="flex items-center gap-1.5 text-xs text-con-mute">
        champ:
        <select
          value={selectedId ?? ""}
          onChange={(e) => onSelect(e.target.value)}
          className="rounded border border-con-border bg-con-panel2 px-2 py-1 text-sm text-con-text outline-none focus:border-con-accent"
        >
          <option value="" disabled>
            select…
          </option>
          {champions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {/* Level stepper */}
      {champion && (
        <div className="flex items-center gap-1.5 text-xs text-con-mute">
          lvl:
          <div className="flex items-center overflow-hidden rounded border border-con-border">
            <button
              onClick={() => onLevel(level - 1)}
              className="px-2 py-1 text-con-mute transition hover:bg-con-grid hover:text-con-text"
              aria-label="Decrease level"
            >
              −
            </button>
            <span className="tabular w-7 bg-con-panel2 py-1 text-center text-sm font-semibold text-con-text">
              {level}
            </span>
            <button
              onClick={() => onLevel(level + 1)}
              className="px-2 py-1 text-con-mute transition hover:bg-con-grid hover:text-con-text"
              aria-label="Increase level"
            >
              +
            </button>
          </div>
          <input
            type="range"
            min={1}
            max={15}
            value={level}
            onChange={(e) => onLevel(Number(e.target.value))}
            className="con-range hidden h-1.5 w-24 sm:block"
            aria-label="Level"
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span
          className={`rounded px-2 py-1 text-[11px] font-medium ${
            patchMeta.verified ? "bg-con-accent/15 text-con-accent" : "bg-con-amber/15 text-con-amber"
          }`}
        >
          patch {patch} {patchMeta.verified ? "✓" : "·sample"}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 rounded border border-con-border px-2.5 py-1 text-xs text-con-text transition hover:border-con-accent"
        >
          {copied ? <CheckIcon width={14} height={14} /> : <ShareIcon width={14} height={14} />}
          {copied ? "copied" : "share"}
        </button>
        <DesignSwitcher current="console" query={query} />
      </div>
    </header>
  );
}

/* ── Item table ───────────────────────────────────────────────────────── */

function ItemTable({ onAdd, full }: { onAdd: (id: string) => void; full: boolean }) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Set<StatKey>>(new Set());
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "cost", dir: 1 });

  function toggle(k: StatKey) {
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  function sortBy(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  }

  const rows = useMemo(() => {
    const filtered = items.filter((it) => {
      if (q && !it.name.toLowerCase().includes(q.toLowerCase())) return false;
      for (const f of filters) if (!it.stats[f]) return false;
      return true;
    });
    const eff = (it: Item) => goldEfficiency(it) ?? -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "name") cmp = a.name.localeCompare(b.name);
      else if (sort.key === "cost") cmp = a.cost - b.cost;
      else cmp = eff(a) - eff(b);
      return cmp * sort.dir;
    });
  }, [q, filters, sort]);

  return (
    <Card
      title={`Item Database · ${rows.length}`}
      right={
        <div className="relative">
          <SearchIcon
            width={13}
            height={13}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-con-mute"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="filter…"
            className="w-32 rounded border border-con-border bg-con-panel2 py-1 pl-7 pr-2 text-xs outline-none focus:border-con-accent"
          />
        </div>
      }
    >
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-b border-con-border px-2 py-2">
        {STAT_FILTERS.map((f) => {
          const active = filters.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggle(f.key)}
              className={`shrink-0 rounded px-2 py-0.5 text-[11px] transition ${
                active
                  ? "bg-con-accent text-con-bg"
                  : "border border-con-border text-con-mute hover:border-con-accent/60 hover:text-con-text"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {full && (
        <p className="border-b border-con-border bg-con-amber/10 px-3 py-1.5 text-[11px] text-con-amber">
          build full (6/6) — remove an item to add more
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead>
            <tr className="border-b border-con-border text-[11px] uppercase tracking-wide text-con-mute">
              <Th onClick={() => sortBy("name")} active={sort.key === "name"} dir={sort.dir}>
                Item
              </Th>
              <th className="px-3 py-1.5 font-medium">Stats</th>
              <Th onClick={() => sortBy("cost")} active={sort.key === "cost"} dir={sort.dir} right>
                Cost
              </Th>
              <Th onClick={() => sortBy("eff")} active={sort.key === "eff"} dir={sort.dir} right>
                Eff
              </Th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => (
              <ItemRow key={it.id} item={it} onAdd={onAdd} disabled={full} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-con-mute">
                  no items match
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  right,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  dir: 1 | -1;
  right?: boolean;
}) {
  return (
    <th className={`px-3 py-1.5 font-medium ${right ? "text-right" : ""}`}>
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition hover:text-con-text ${
          active ? "text-con-accent" : ""
        }`}
      >
        {children}
        {active &&
          (dir === 1 ? (
            <ArrowUpIcon width={12} height={12} />
          ) : (
            <ArrowDownIcon width={12} height={12} />
          ))}
      </button>
    </th>
  );
}

function ItemRow({
  item,
  onAdd,
  disabled,
}: {
  item: Item;
  onAdd: (id: string) => void;
  disabled: boolean;
}) {
  const eff = goldEfficiency(item);
  const lines = itemStatLines(item);
  const color = ITEM_CLASS_COLOR[itemClass(item)];
  return (
    <tr
      onClick={() => !disabled && onAdd(item.id)}
      className={`group border-b border-con-border/60 transition ${
        disabled ? "opacity-40" : "cursor-pointer hover:bg-con-grid"
      }`}
    >
      <td className="px-3 py-2">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} />
          <span className="font-medium text-con-text">{item.name}</span>
        </span>
      </td>
      <td className="px-3 py-2">
        <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-con-mute">
          {lines.map((l) => (
            <span key={l.key} className="tabular whitespace-nowrap">
              <span className="text-con-text">+{l.display}</span> {STAT_META[l.key].label}
            </span>
          ))}
        </span>
      </td>
      <td className="tabular px-3 py-2 text-right text-con-amber">{formatGold(item.cost)}</td>
      <td className="tabular px-3 py-2 text-right">
        {eff !== null ? (
          <span className={eff >= 1 ? "text-con-accent" : "text-con-mute"}>
            {Math.round(eff * 100)}%
          </span>
        ) : (
          <span className="text-con-mute">—</span>
        )}
      </td>
      <td className="pr-3 text-right">
        <span className="text-con-mute opacity-0 transition group-hover:opacity-100">+</span>
      </td>
    </tr>
  );
}

/* ── Build strip ──────────────────────────────────────────────────────── */

function BuildStrip({
  items: buildItems,
  maxItems,
  goldCost,
  onRemove,
  onClear,
}: {
  items: Item[];
  maxItems: number;
  goldCost: number;
  onRemove: (i: number) => void;
  onClear: () => void;
}) {
  const slots = Array.from({ length: maxItems }, (_, i) => buildItems[i] ?? null);
  return (
    <Card
      title="Build"
      right={
        <div className="flex items-center gap-2 text-xs">
          <span className="tabular text-con-amber">{formatGold(goldCost)}g</span>
          <button
            onClick={onClear}
            disabled={buildItems.length === 0}
            className="text-con-mute transition hover:text-con-red disabled:opacity-30"
          >
            clear
          </button>
        </div>
      }
    >
      <div className="flex gap-1.5 p-2.5">
        {slots.map((it, i) => (
          <div key={i} className="aspect-square flex-1">
            {it ? (
              <button
                onClick={() => onRemove(i)}
                title={`Remove ${it.name}`}
                className="group relative grid h-full w-full place-items-center rounded border"
                style={{ borderColor: `${ITEM_CLASS_COLOR[itemClass(it)]}88` }}
              >
                <span
                  className="text-[11px] font-bold"
                  style={{ color: ITEM_CLASS_COLOR[itemClass(it)] }}
                >
                  {it.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="absolute inset-0 grid place-items-center rounded bg-con-bg/85 opacity-0 transition group-hover:opacity-100">
                  <XIcon width={14} height={14} className="text-con-red" />
                </span>
              </button>
            ) : (
              <div className="grid h-full w-full place-items-center rounded border border-dashed border-con-border text-con-mute/40">
                ·
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── Stat readout (base / +items / total) ─────────────────────────────── */

function StatReadout({ total, base }: { total: StatRow[]; base: StatRow[] }) {
  const baseByKey = new Map(base.map((r) => [r.key, r]));
  const groups: StatGroup[] = ["offense", "defense", "utility"];

  return (
    <Card title="Stats · base / +items / total">
      <div className="px-3 py-2">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 border-b border-con-border pb-1 text-[10px] uppercase tracking-wide text-con-mute">
          <span>stat</span>
          <span className="text-right">base</span>
          <span className="text-right">+items</span>
          <span className="text-right">total</span>
        </div>

        {groups.map((g) => {
          const gr = total.filter((r) => r.group === g);
          if (gr.length === 0) return null;
          return (
            <div key={g} className="mt-2">
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${GROUP_ACCENT[g]}`}>
                {GROUP_LABEL[g]}
              </div>
              {gr.map((r) => {
                const b = baseByKey.get(r.key);
                const baseVal = b?.value ?? 0;
                const delta = r.value - baseVal;
                const deltaDisplay =
                  r.key === "attackSpeed"
                    ? delta.toFixed(2)
                    : formatStat(r.key, Math.abs(delta));
                return (
                  <div
                    key={r.key}
                    className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 border-b border-con-border/40 py-1 text-[13px] last:border-0"
                  >
                    <span className="flex items-center gap-1.5 text-con-text/85">
                      <StatIcon statKey={r.key} width={13} height={13} className="text-con-mute" />
                      {r.label}
                    </span>
                    <span className="tabular text-right text-con-mute">{b?.display ?? "—"}</span>
                    <span
                      className={`tabular text-right ${delta > 0.0001 ? "text-con-accent" : "text-con-mute/50"}`}
                    >
                      {delta > 0.0001 ? `+${deltaDisplay}` : "—"}
                    </span>
                    <span className="tabular text-right font-semibold text-con-text">
                      {r.display}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="mt-3 grid min-h-[24rem] place-items-center rounded-md border border-dashed border-con-border bg-con-panel/50 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded bg-con-accent/10 text-con-accent">
          ▮
        </div>
        <p className="text-sm text-con-text">no champion loaded</p>
        <p className="mt-1 text-xs text-con-mute">
          select a champion in the toolbar to load the item database and stat readout
        </p>
      </div>
    </div>
  );
}
