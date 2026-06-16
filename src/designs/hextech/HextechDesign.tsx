"use client";

import { useEffect, useMemo, useState } from "react";
import { champions, getChampion, getItems, items, patchMeta } from "@/lib/data";
import { computeBuild, goldEfficiency } from "@/lib/stats/engine";
import { encodeBuild, useBuildState } from "@/state/buildState";
import type { Champion, Item, StatBlock, StatKey } from "@/lib/schema";
import { statRows, itemStatLines, GROUP_LABEL, type StatGroup } from "@/lib/statDisplay";
import { formatGold } from "@/lib/format";
import { initials, itemClass, ITEM_CLASS_COLOR } from "@/lib/visual";
import { useShare } from "@/lib/useShare";
import { DesignSwitcher } from "@/designs/shared/DesignSwitcher";
import {
  SearchIcon,
  ShareIcon,
  CheckIcon,
  XIcon,
  StatIcon,
  GoldIcon,
} from "@/lib/icons";

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

const GROUP_ACCENT: Record<StatGroup, string> = {
  offense: "text-rift-ad",
  defense: "text-rift-tank",
  utility: "text-rift-blue",
};

export default function HextechDesign() {
  const { build, patch, setChampion, setLevel, addItem, removeItemAt, clearItems, maxItems } =
    useBuildState();
  const [pickerOpen, setPickerOpen] = useState(true);

  useEffect(() => {
    document.title = "Hextech Arsenal · Wild Rift Builder";
  }, []);

  const champion = build.championId ? getChampion(build.championId) : undefined;
  const buildItems = useMemo(() => getItems(build.itemIds), [build.itemIds]);
  const totals = useMemo(
    () => (champion ? computeBuild(champion, build.level, buildItems) : null),
    [champion, build.level, buildItems],
  );
  const query = encodeBuild(build);
  const full = build.itemIds.length >= maxItems;

  useEffect(() => {
    if (champion) setPickerOpen(false);
  }, [champion?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative min-h-screen bg-rift-bg font-sans text-rift-gold2">
      {/* Texture + ambient light */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(900px 500px at 50% -8%, rgba(10,200,185,0.12), transparent 60%), radial-gradient(700px 400px at 100% 0%, rgba(200,170,110,0.08), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(200,170,110,1) 1px, transparent 1px), linear-gradient(90deg, rgba(200,170,110,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-3 pb-24 pt-3 sm:px-5">
        <TopBar patch={patch} query={query} />

        <ChampionBanner
          champion={champion}
          level={build.level}
          onLevel={setLevel}
          pickerOpen={pickerOpen}
          onTogglePicker={() => setPickerOpen((v) => !v)}
        />

        {pickerOpen && (
          <ChampionSelect selectedId={build.championId} onSelect={setChampion} />
        )}

        {champion && totals && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <Shop onAdd={addItem} full={full} />
            <div className="space-y-4">
              <Inventory
                items={buildItems}
                maxItems={maxItems}
                goldCost={totals.goldCost}
                onRemove={removeItemAt}
                onClear={clearItems}
              />
              <StatHud stats={totals.stats} attackSpeed={totals.attackSpeed} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Frame: 1px hextech-gold beveled border ───────────────────────────── */

function Frame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="clip-bevel bg-gradient-to-b from-rift-gold/70 via-rift-border to-rift-border/40 p-px">
      <div className={`clip-bevel bg-rift-panel ${className}`}>{children}</div>
    </div>
  );
}

function GoldHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-sm uppercase tracking-[0.2em] text-rift-gold">{children}</h2>
  );
}

function Divider() {
  return (
    <div className="my-3 h-px w-full bg-gradient-to-r from-transparent via-rift-gold/40 to-transparent" />
  );
}

/* ── Top bar ──────────────────────────────────────────────────────────── */

function TopBar({ patch, query }: { patch: string; query: string }) {
  const { copied, copy } = useShare();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3">
        <span className="hex-clip grid h-9 w-9 place-items-center bg-gradient-to-br from-rift-gold to-rift-ad font-display font-bold text-rift-bg">
          WR
        </span>
        <h1 className="font-display text-lg uppercase tracking-[0.18em] text-rift-gold">
          Wild Rift Builder
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`clip-bevel-sm px-3 py-1.5 text-xs font-semibold ${
            patchMeta.verified
              ? "bg-rift-blue/15 text-rift-blue"
              : "bg-rift-tank/15 text-rift-tank"
          }`}
        >
          Patch {patch} {patchMeta.verified ? "✓" : "· sample"}
        </span>
        <button
          onClick={copy}
          className="clip-bevel-sm flex items-center gap-1.5 border border-rift-gold/40 px-3 py-1.5 text-sm text-rift-gold transition hover:bg-rift-gold/10"
        >
          {copied ? <CheckIcon width={15} height={15} /> : <ShareIcon width={15} height={15} />}
          {copied ? "Copied" : "Share"}
        </button>
        <DesignSwitcher current="hextech" query={query} />
      </div>
    </header>
  );
}

/* ── Champion banner ──────────────────────────────────────────────────── */

function ChampionBanner({
  champion,
  level,
  onLevel,
  pickerOpen,
  onTogglePicker,
}: {
  champion: Champion | undefined;
  level: number;
  onLevel: (n: number) => void;
  pickerOpen: boolean;
  onTogglePicker: () => void;
}) {
  return (
    <Frame className="relative overflow-hidden">
      {/* splash gradient */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-50"
        style={{
          background: champion
            ? `linear-gradient(120deg, ${ITEM_CLASS_COLOR.ad}22, transparent 45%), radial-gradient(600px 200px at 12% 50%, rgba(10,200,185,0.18), transparent 70%)`
            : "none",
        }}
      />
      <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        {champion ? (
          <>
            <span
              className="hex-clip grid h-20 w-20 shrink-0 place-items-center font-display text-2xl font-bold text-rift-bg shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${ITEM_CLASS_COLOR.ad}, ${ITEM_CLASS_COLOR.ap})`,
              }}
            >
              {initials(champion.name)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl uppercase tracking-wide text-rift-gold2">
                {champion.name}
              </h2>
              <p className="text-sm italic text-rift-gold2/60">{champion.title}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {champion.roles.map((r) => (
                  <span
                    key={r}
                    className="clip-bevel-sm border border-rift-gold/30 px-2 py-0.5 text-[11px] uppercase tracking-wide text-rift-gold"
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
            <LevelOrb level={level} onChange={onLevel} />
            <button
              onClick={onTogglePicker}
              className="clip-bevel-sm self-start border border-rift-border px-3 py-1.5 text-xs uppercase tracking-wide text-rift-gold2/70 transition hover:border-rift-gold hover:text-rift-gold"
            >
              {pickerOpen ? "Close" : "Change"}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3 py-2">
            <span className="hex-clip grid h-16 w-16 place-items-center bg-rift-panel2 text-rift-gold/50">
              <SearchIcon width={26} height={26} />
            </span>
            <div>
              <h2 className="font-display text-xl uppercase tracking-wide text-rift-gold">
                Choose your champion
              </h2>
              <p className="text-sm text-rift-gold2/50">
                Select a champion below to open the arsenal.
              </p>
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}

function LevelOrb({ level, onChange }: { level: number; onChange: (n: number) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <span className="hex-clip grid h-16 w-16 place-items-center bg-gradient-to-br from-rift-gold to-rift-ad text-rift-bg">
        <span className="text-center leading-none">
          <span className="block text-[9px] font-semibold uppercase tracking-wide">Lvl</span>
          <span className="font-display text-2xl font-bold">{level}</span>
        </span>
      </span>
      <input
        type="range"
        min={1}
        max={15}
        value={level}
        onChange={(e) => onChange(Number(e.target.value))}
        className="hex-range h-1.5 w-28"
        aria-label="Champion level"
      />
    </div>
  );
}

/* ── Champion select grid ─────────────────────────────────────────────── */

function ChampionSelect({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = champions.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mt-4">
      <Frame className="p-4">
        <div className="flex items-center justify-between">
          <GoldHeading>Champion Select</GoldHeading>
          <div className="relative">
            <SearchIcon
              width={15}
              height={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-rift-gold2/40"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-40 rounded border border-rift-border bg-rift-panel2 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-rift-gold"
            />
          </div>
        </div>
        <Divider />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="group flex flex-col items-center gap-1.5"
              title={`${c.name} — ${c.title}`}
            >
              <span
                className={`hex-clip grid h-16 w-16 place-items-center font-display text-lg font-bold transition ${
                  c.id === selectedId
                    ? "bg-gradient-to-br from-rift-gold to-rift-ad text-rift-bg"
                    : "bg-rift-panel2 text-rift-gold2/80 group-hover:bg-rift-border"
                }`}
                style={
                  c.id === selectedId
                    ? { boxShadow: "0 0 18px rgba(200,170,110,0.45)" }
                    : undefined
                }
              >
                {initials(c.name)}
              </span>
              <span
                className={`text-xs ${
                  c.id === selectedId ? "text-rift-gold" : "text-rift-gold2/60"
                }`}
              >
                {c.name}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-4 text-center text-sm text-rift-gold2/50">
              No champions match.
            </p>
          )}
        </div>
      </Frame>
    </div>
  );
}

/* ── Shop ─────────────────────────────────────────────────────────────── */

function Shop({ onAdd, full }: { onAdd: (id: string) => void; full: boolean }) {
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
    <Frame className="p-4">
      <div className="flex items-center justify-between">
        <GoldHeading>Item Shop</GoldHeading>
        <span className="text-xs text-rift-gold2/50">{filtered.length} items</span>
      </div>
      <div className="relative mt-3">
        <SearchIcon
          width={15}
          height={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-rift-gold2/40"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search items…"
          className="w-full rounded border border-rift-border bg-rift-panel2 py-2 pl-9 pr-3 text-sm outline-none focus:border-rift-gold"
        />
      </div>
      <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {STAT_FILTERS.map((f) => {
          const active = filters.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggle(f.key)}
              className={`clip-bevel-sm flex shrink-0 items-center gap-1 px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? "bg-rift-gold text-rift-bg"
                  : "border border-rift-border text-rift-gold2/70 hover:border-rift-gold"
              }`}
            >
              <StatIcon statKey={f.key} width={13} height={13} />
              {f.label}
            </button>
          );
        })}
      </div>

      {full && (
        <p className="clip-bevel-sm mt-3 bg-rift-tank/15 px-3 py-2 text-xs text-rift-tank">
          Inventory full — remove an item to add another.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {filtered.map((it) => (
          <HexItem key={it.id} item={it} onAdd={onAdd} disabled={full} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-rift-gold2/50">
            No items match.
          </p>
        )}
      </div>
    </Frame>
  );
}

function HexItem({
  item,
  onAdd,
  disabled,
}: {
  item: Item;
  onAdd: (id: string) => void;
  disabled: boolean;
}) {
  const color = ITEM_CLASS_COLOR[itemClass(item)];
  const eff = goldEfficiency(item);
  const lines = itemStatLines(item);
  return (
    <button
      onClick={() => onAdd(item.id)}
      disabled={disabled}
      title={
        item.effects.map((e) => `${e.name}: ${e.description}`).join("\n") || undefined
      }
      className="group flex flex-col items-center rounded-md border border-rift-border bg-rift-panel2/60 p-2.5 text-center transition hover:border-rift-gold disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className="hex-clip relative grid h-14 w-14 place-items-center font-display text-base font-bold transition group-hover:scale-105"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}66)`,
          color: "#0a1428",
          boxShadow: `0 0 0 1px ${color}, inset 0 0 12px ${color}66`,
        }}
      >
        {initials(item.name)}
      </span>
      <span className="mt-2 line-clamp-1 text-xs font-semibold text-rift-gold2">{item.name}</span>
      <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-rift-gold">
        <GoldIcon width={12} height={12} />
        {formatGold(item.cost)}
      </span>
      <ul className="mt-1 space-y-0.5">
        {lines.slice(0, 3).map((l) => (
          <li key={l.key} className="text-[11px] text-rift-gold2/60">
            +{l.display} {l.label}
          </li>
        ))}
      </ul>
      {eff !== null && (
        <span className="mt-1 text-[10px] text-rift-blue/80">{Math.round(eff * 100)}% eff</span>
      )}
    </button>
  );
}

/* ── Inventory (build slots) ──────────────────────────────────────────── */

function Inventory({
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
    <Frame className="p-4">
      <div className="flex items-center justify-between">
        <GoldHeading>Inventory</GoldHeading>
        <button
          onClick={onClear}
          disabled={buildItems.length === 0}
          className="text-xs text-rift-gold2/50 transition hover:text-rift-tank disabled:opacity-30"
        >
          Clear
        </button>
      </div>
      <Divider />
      <div className="grid grid-cols-3 gap-2.5">
        {slots.map((it, i) => (
          <div key={i} className="aspect-square">
            {it ? (
              <button
                onClick={() => onRemove(i)}
                title={`Remove ${it.name}`}
                className="group relative grid h-full w-full place-items-center rounded-md border bg-rift-panel2"
                style={{ borderColor: `${ITEM_CLASS_COLOR[itemClass(it)]}99` }}
              >
                <span
                  className="font-display text-lg font-bold"
                  style={{ color: ITEM_CLASS_COLOR[itemClass(it)] }}
                >
                  {initials(it.name)}
                </span>
                <span className="absolute inset-0 grid place-items-center rounded-md bg-rift-bg/85 opacity-0 transition group-hover:opacity-100">
                  <XIcon width={18} height={18} className="text-rift-tank" />
                </span>
              </button>
            ) : (
              <div className="grid h-full w-full place-items-center rounded-md border border-dashed border-rift-border text-rift-border">
                <span className="text-xl">◇</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-rift-border/60 pt-3">
        <span className="text-xs uppercase tracking-wide text-rift-gold2/60">Total Gold</span>
        <span className="flex items-center gap-1.5 font-display text-lg text-rift-gold">
          <GoldIcon width={16} height={16} />
          {formatGold(goldCost)}
        </span>
      </div>
    </Frame>
  );
}

/* ── Stat HUD ─────────────────────────────────────────────────────────── */

const STAT_REF: Partial<Record<StatKey, number>> = {
  attackDamage: 400,
  abilityPower: 600,
  attackSpeed: 2.5,
  maxHealth: 4000,
  armor: 300,
  magicResist: 250,
  mana: 2500,
  abilityHaste: 100,
};

function StatHud({ stats, attackSpeed }: { stats: StatBlock; attackSpeed: number }) {
  const rows = statRows(stats, attackSpeed);
  const groups: StatGroup[] = ["offense", "defense", "utility"];
  return (
    <Frame className="p-4">
      <GoldHeading>Champion Stats</GoldHeading>
      <Divider />
      <div className="space-y-4">
        {groups.map((g) => {
          const gr = rows.filter((r) => r.group === g);
          if (gr.length === 0) return null;
          return (
            <div key={g}>
              <h3 className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] ${GROUP_ACCENT[g]}`}>
                {GROUP_LABEL[g]}
              </h3>
              <div className="space-y-2">
                {gr.map((r) => {
                  const ref = STAT_REF[r.key];
                  const pct = ref ? Math.min(100, (r.value / ref) * 100) : null;
                  return (
                    <div key={r.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-rift-gold2/80">
                          <StatIcon statKey={r.key} width={14} height={14} className="text-rift-gold/70" />
                          {r.label}
                        </span>
                        <span className="tabular font-semibold text-rift-gold2">{r.display}</span>
                      </div>
                      {pct !== null && (
                        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-rift-panel2">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-rift-gold/60 to-rift-gold"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
}
