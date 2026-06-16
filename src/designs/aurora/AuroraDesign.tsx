"use client";

import { useEffect, useMemo, useState } from "react";
import { champions, getChampion, getItems, items, patchMeta } from "@/lib/data";
import { computeBuild, goldEfficiency } from "@/lib/stats/engine";
import { encodeBuild, useBuildState } from "@/state/buildState";
import { STAT_META, type Champion, type Item, type StatKey } from "@/lib/schema";
import { statRows, itemStatLines, GROUP_LABEL, type StatGroup } from "@/lib/statDisplay";
import { formatGold } from "@/lib/format";
import { initials, hashHue, itemClass, ITEM_CLASS_COLOR } from "@/lib/visual";
import { useShare } from "@/lib/useShare";
import { DesignSwitcher } from "@/designs/shared/DesignSwitcher";
import {
  SearchIcon,
  ShareIcon,
  CheckIcon,
  PlusIcon,
  XIcon,
  StatIcon,
  GoldIcon,
} from "@/lib/icons";

const STAT_FILTERS: { key: StatKey; label: string }[] = [
  { key: "attackDamage", label: "AD" },
  { key: "abilityPower", label: "AP" },
  { key: "attackSpeed", label: "Attack Speed" },
  { key: "critChance", label: "Crit" },
  { key: "armor", label: "Armor" },
  { key: "magicResist", label: "Magic Resist" },
  { key: "maxHealth", label: "Health" },
  { key: "abilityHaste", label: "Haste" },
];

const GROUP_ACCENT: Record<StatGroup, string> = {
  offense: "text-aurora-pink",
  defense: "text-aurora-teal",
  utility: "text-aurora-violet",
};

export default function AuroraDesign() {
  const { build, patch, setChampion, setLevel, addItem, removeItemAt, clearItems, maxItems } =
    useBuildState();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    document.title = "Aurora · Wild Rift Builder";
  }, []);

  const champion = build.championId ? getChampion(build.championId) : undefined;
  const buildItems = useMemo(() => getItems(build.itemIds), [build.itemIds]);
  const totals = useMemo(
    () => (champion ? computeBuild(champion, build.level, buildItems) : null),
    [champion, build.level, buildItems],
  );
  const query = encodeBuild(build);
  const full = build.itemIds.length >= maxItems;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-aurora-bg font-sans text-aurora-ink">
      <Backdrop />

      <div className="relative mx-auto max-w-7xl px-4 pb-32 pt-4 sm:px-6 lg:pb-10">
        <TopBar patch={patch} query={query} />

        <div className="mt-6 grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)_22rem]">
          {/* Left rail — champion + level */}
          <div className="space-y-5">
            <ChampionPanel selectedId={build.championId} onSelect={setChampion} />
            {champion && <LevelPanel level={build.level} onChange={setLevel} />}
          </div>

          {/* Center — shop */}
          <div className="min-w-0">
            {champion ? (
              <ShopPanel onAdd={addItem} full={full} />
            ) : (
              <EmptyShop />
            )}
          </div>

          {/* Right — build summary (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-4">
              {champion && totals ? (
                <BuildSummary
                  champion={champion}
                  level={build.level}
                  items={buildItems}
                  maxItems={maxItems}
                  goldCost={totals.goldCost}
                  stats={totals.stats}
                  attackSpeed={totals.attackSpeed}
                  onRemove={removeItemAt}
                  onClear={clearItems}
                />
              ) : (
                <Placeholder />
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile build dock + sheet */}
      {champion && totals && (
        <MobileDock
          goldCost={totals.goldCost}
          itemCount={buildItems.length}
          maxItems={maxItems}
          onOpen={() => setSheetOpen(true)}
        />
      )}
      {champion && totals && sheetOpen && (
        <MobileSheet onClose={() => setSheetOpen(false)}>
          <BuildSummary
            champion={champion}
            level={build.level}
            items={buildItems}
            maxItems={maxItems}
            goldCost={totals.goldCost}
            stats={totals.stats}
            attackSpeed={totals.attackSpeed}
            onRemove={removeItemAt}
            onClear={clearItems}
          />
        </MobileSheet>
      )}
    </div>
  );
}

/* ── Backdrop ─────────────────────────────────────────────────────────── */

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute -left-1/4 -top-1/3 h-[60vh] w-[60vh] animate-aurora-drift rounded-full bg-aurora-teal/20 blur-[120px]" />
      <div className="absolute -right-1/4 top-0 h-[55vh] w-[55vh] animate-aurora-drift rounded-full bg-aurora-violet/20 blur-[120px] [animation-delay:-6s]" />
      <div className="absolute bottom-0 left-1/3 h-[50vh] w-[50vh] animate-aurora-drift rounded-full bg-aurora-pink/10 blur-[120px] [animation-delay:-12s]" />
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}

/* ── Top bar ──────────────────────────────────────────────────────────── */

function TopBar({ patch, query }: { patch: string; query: string }) {
  const { copied, copy } = useShare();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-aurora-teal to-aurora-violet font-bold text-aurora-bg shadow-lg shadow-aurora-teal/20">
          WR
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight">Wild Rift Builder</h1>
          <p className="text-xs text-aurora-mute">Stat &amp; build calculator · Aurora</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <PatchBadge patch={patch} />
        <button
          onClick={copy}
          className="glass glass-hover flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium"
        >
          {copied ? <CheckIcon width={16} height={16} /> : <ShareIcon width={16} height={16} />}
          {copied ? "Copied" : "Share"}
        </button>
        <DesignSwitcher current="aurora" query={query} />
      </div>
    </header>
  );
}

function PatchBadge({ patch }: { patch: string }) {
  return (
    <span
      className={`hidden rounded-full px-3 py-1.5 text-xs font-medium sm:inline-flex ${
        patchMeta.verified
          ? "bg-aurora-teal/15 text-aurora-teal"
          : "bg-amber-400/15 text-amber-300"
      }`}
      title={patchMeta.verified ? "Data hand-verified" : "Sample data — not yet verified"}
    >
      Patch {patch}
      {patchMeta.verified ? " · verified" : " · sample"}
    </span>
  );
}

/* ── Panels ───────────────────────────────────────────────────────────── */

function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-2xl p-4 shadow-xl shadow-black/20">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-aurora-mute">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Monogram({
  name,
  seed,
  size = "md",
  color,
}: {
  name: string;
  seed: string;
  size?: "sm" | "md" | "lg";
  color?: string;
}) {
  const hue = hashHue(seed);
  const bg = color
    ? `linear-gradient(135deg, ${color}, ${color}99)`
    : `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 40) % 360} 70% 35%))`;
  const dim = size === "lg" ? "h-12 w-12 text-base" : size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs";
  return (
    <span
      className={`grid ${dim} shrink-0 place-items-center rounded-xl font-bold text-white shadow-inner`}
      style={{ background: bg }}
    >
      {initials(name)}
    </span>
  );
}

function ChampionPanel({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = champions.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Panel title="Champion">
      <SearchInput value={q} onChange={setQ} placeholder="Search champions…" />
      <div className="mt-3 space-y-2">
        {filtered.map((c) => (
          <ChampionCard key={c.id} champ={c} selected={c.id === selectedId} onSelect={onSelect} />
        ))}
        {filtered.length === 0 && (
          <p className="px-1 py-2 text-sm text-aurora-mute">No champions match.</p>
        )}
      </div>
    </Panel>
  );
}

function ChampionCard({
  champ,
  selected,
  onSelect,
}: {
  champ: Champion;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(champ.id)}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        selected
          ? "border-aurora-teal/60 bg-aurora-teal/10"
          : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
      }`}
    >
      <Monogram name={champ.name} seed={champ.id} />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{champ.name}</span>
        <span className="block truncate text-xs text-aurora-mute">
          {champ.title || champ.roles.join(" · ")}
        </span>
      </span>
      {selected && <CheckIcon width={18} height={18} className="ml-auto text-aurora-teal" />}
    </button>
  );
}

function LevelPanel({ level, onChange }: { level: number; onChange: (n: number) => void }) {
  return (
    <Panel
      title="Level"
      right={
        <span className="tabular text-xl font-bold text-aurora-ink">
          {level}
          <span className="text-sm font-normal text-aurora-mute">/15</span>
        </span>
      }
    >
      <input
        type="range"
        min={1}
        max={15}
        value={level}
        onChange={(e) => onChange(Number(e.target.value))}
        className="aurora-range w-full"
      />
      <div className="mt-2 flex justify-between text-[10px] text-aurora-mute">
        {[1, 5, 10, 15].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className="rounded px-1.5 py-0.5 transition hover:text-aurora-ink"
          >
            {n}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function ShopPanel({ onAdd, full }: { onAdd: (id: string) => void; full: boolean }) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Set<StatKey>>(new Set());

  function toggle(k: StatKey) {
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  }

  const filtered = useMemo(
    () =>
      items.filter((it) => {
        if (q && !it.name.toLowerCase().includes(q.toLowerCase())) return false;
        for (const f of filters) if (!it.stats[f]) return false;
        return true;
      }),
    [q, filters],
  );

  return (
    <Panel
      title="Item shop"
      right={<span className="text-xs text-aurora-mute">{filtered.length} items</span>}
    >
      <SearchInput value={q} onChange={setQ} placeholder="Search items…" />
      <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {STAT_FILTERS.map((f) => {
          const active = filters.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggle(f.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-aurora-teal text-aurora-bg"
                  : "border border-white/10 text-aurora-mute hover:border-white/25 hover:text-aurora-ink"
              }`}
            >
              <StatIcon statKey={f.key} width={14} height={14} />
              {f.label}
            </button>
          );
        })}
      </div>

      {full && (
        <p className="mt-3 rounded-lg bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
          Build is full — remove an item to add another.
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((it) => (
          <ItemCard key={it.id} item={it} onAdd={onAdd} disabled={full} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-aurora-mute">
            No items match your filters.
          </p>
        )}
      </div>
    </Panel>
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
  const lines = itemStatLines(item);
  const color = ITEM_CLASS_COLOR[itemClass(item)];
  return (
    <button
      onClick={() => onAdd(item.id)}
      disabled={disabled}
      className="group relative flex flex-col rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="flex items-start gap-2.5">
        <Monogram name={item.name} seed={item.id} color={color} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold leading-tight">{item.name}</span>
          </div>
          <span className="flex items-center gap-1 text-xs font-medium text-aurora-mute">
            <GoldIcon width={13} height={13} className="text-amber-300" />
            {formatGold(item.cost)}
          </span>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 text-aurora-mute transition group-hover:bg-aurora-teal group-hover:text-aurora-bg">
          <PlusIcon width={16} height={16} />
        </span>
      </div>
      <ul className="mt-2 space-y-0.5">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-1.5 text-xs text-aurora-ink/85">
            <StatIcon statKey={l.key} width={13} height={13} className="text-aurora-mute" />
            <span className="tabular font-medium">+{l.display}</span>
            <span className="text-aurora-mute">{l.label}</span>
          </li>
        ))}
      </ul>
      {item.effects.length > 0 && (
        <p className="mt-1.5 line-clamp-2 text-[11px] italic text-aurora-mute/80">
          {item.effects[0].name}: {item.effects[0].description}
        </p>
      )}
      {eff !== null && (
        <span className="mt-2 inline-flex w-fit rounded-full bg-aurora-violet/15 px-2 py-0.5 text-[11px] font-medium text-aurora-violet">
          {Math.round(eff * 100)}% gold efficient
        </span>
      )}
    </button>
  );
}

/* ── Build summary ────────────────────────────────────────────────────── */

function BuildSummary({
  champion,
  level,
  items: buildItems,
  maxItems,
  goldCost,
  stats,
  attackSpeed,
  onRemove,
  onClear,
}: {
  champion: Champion;
  level: number;
  items: Item[];
  maxItems: number;
  goldCost: number;
  stats: import("@/lib/schema").StatBlock;
  attackSpeed: number;
  onRemove: (i: number) => void;
  onClear: () => void;
}) {
  const slots = Array.from({ length: maxItems }, (_, i) => buildItems[i] ?? null);
  const rows = statRows(stats, attackSpeed);
  const groups: StatGroup[] = ["offense", "defense", "utility"];

  return (
    <div className="glass rounded-2xl p-4 shadow-xl shadow-black/30">
      <div className="flex items-center gap-3">
        <Monogram name={champion.name} seed={champion.id} size="lg" />
        <div className="min-w-0">
          <div className="truncate font-semibold">{champion.name}</div>
          <div className="text-xs text-aurora-mute">Level {level}</div>
        </div>
        <button
          onClick={onClear}
          disabled={buildItems.length === 0}
          className="ml-auto text-xs text-aurora-mute transition hover:text-aurora-pink disabled:opacity-30"
        >
          Clear
        </button>
      </div>

      <div className="mt-4 grid grid-cols-6 gap-1.5">
        {slots.map((it, i) => (
          <div key={i} className="aspect-square">
            {it ? (
              <button
                onClick={() => onRemove(i)}
                title={`Remove ${it.name}`}
                className="group relative grid h-full w-full place-items-center rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${ITEM_CLASS_COLOR[itemClass(it)]}33, transparent)`,
                  border: `1px solid ${ITEM_CLASS_COLOR[itemClass(it)]}55`,
                }}
              >
                <span className="text-[11px] font-bold" style={{ color: ITEM_CLASS_COLOR[itemClass(it)] }}>
                  {initials(it.name)}
                </span>
                <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/70 opacity-0 transition group-hover:opacity-100">
                  <XIcon width={16} height={16} className="text-aurora-pink" />
                </span>
              </button>
            ) : (
              <div className="grid h-full w-full place-items-center rounded-lg border border-dashed border-white/10 text-white/20">
                <PlusIcon width={14} height={14} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2">
        <span className="text-xs text-aurora-mute">Total cost</span>
        <span className="tabular flex items-center gap-1 font-semibold text-amber-300">
          <GoldIcon width={15} height={15} />
          {formatGold(goldCost)}
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {groups.map((g) => {
          const gr = rows.filter((r) => r.group === g);
          if (gr.length === 0) return null;
          return (
            <div key={g}>
              <h3 className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wider ${GROUP_ACCENT[g]}`}>
                {GROUP_LABEL[g]}
              </h3>
              <div className="space-y-1">
                {gr.map((r) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between border-b border-white/5 py-1 text-sm last:border-0"
                  >
                    <span className="flex items-center gap-2 text-aurora-ink/80">
                      <StatIcon statKey={r.key} width={15} height={15} className="text-aurora-mute" />
                      {r.label}
                    </span>
                    <span className="tabular font-semibold">{r.display}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Mobile dock + sheet ──────────────────────────────────────────────── */

function MobileDock({
  goldCost,
  itemCount,
  maxItems,
  onOpen,
}: {
  goldCost: number;
  itemCount: number;
  maxItems: number;
  onOpen: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-aurora-bg/80 p-3 backdrop-blur-xl lg:hidden">
      <button
        onClick={onOpen}
        className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-aurora-teal to-aurora-violet px-4 py-3 font-semibold text-aurora-bg"
      >
        <span className="flex items-center gap-2">
          <GoldIcon width={18} height={18} />
          {formatGold(goldCost)}
        </span>
        <span>
          View build · {itemCount}/{maxItems}
        </span>
      </button>
    </div>
  );
}

function MobileSheet({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-fade-up overflow-y-auto rounded-t-3xl border-t border-white/10 bg-aurora-bg p-4 pb-8">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
        <div className="mb-3 flex justify-end">
          <button onClick={onClose} className="rounded-full bg-white/5 p-2 text-aurora-mute">
            <XIcon width={18} height={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ── Empty states + inputs ────────────────────────────────────────────── */

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <SearchIcon
        width={16}
        height={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-aurora-mute"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-aurora-ink outline-none transition placeholder:text-aurora-mute/60 focus:border-aurora-teal/60 focus:bg-white/[0.05]"
      />
    </div>
  );
}

function EmptyShop() {
  return (
    <div className="glass grid min-h-[20rem] place-items-center rounded-2xl p-8 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-aurora-teal/30 to-aurora-violet/30">
          <SearchIcon width={26} height={26} className="text-aurora-teal" />
        </div>
        <p className="font-medium">Pick a champion to begin</p>
        <p className="mt-1 text-sm text-aurora-mute">
          The shop and live stats appear once a champion is selected.
        </p>
      </div>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="glass rounded-2xl p-6 text-center text-sm text-aurora-mute">
      Select a champion to see your live build summary.
    </div>
  );
}
