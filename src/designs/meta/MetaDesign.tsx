"use client";

import { useEffect, useMemo, useState } from "react";
import { champions, getChampion, getItems, items, patchMeta } from "@/lib/data";
import { computeBuild, goldEfficiency } from "@/lib/stats/engine";
import { encodeBuild, useBuildState } from "@/state/buildState";
import { STAT_META, type Ability, type Champion, type Item, type StatBlock, type StatKey } from "@/lib/schema";
import { statRows, itemStatLines, GROUP_LABEL, type StatGroup } from "@/lib/statDisplay";
import { formatStat, formatGold } from "@/lib/format";
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
  SwordIcon,
  ChevronRightIcon,
} from "@/lib/icons";

const STAT_FILTERS: { key: StatKey; label: string }[] = [
  { key: "attackDamage", label: "AD" },
  { key: "abilityPower", label: "AP" },
  { key: "attackSpeed", label: "Attack Speed" },
  { key: "critChance", label: "Crit" },
  { key: "armor", label: "Armor" },
  { key: "magicResist", label: "MR" },
  { key: "maxHealth", label: "Health" },
  { key: "abilityHaste", label: "Haste" },
];

const GROUP_ACCENT: Record<StatGroup, string> = {
  offense: "text-meta-coral",
  defense: "text-meta-blue2",
  utility: "text-meta-green",
};

const ABILITY_SLOTS: Ability["slot"][] = ["passive", "Q", "W", "E", "R"];
const SLOT_LABEL: Record<Ability["slot"], string> = {
  passive: "P",
  Q: "Q",
  W: "W",
  E: "E",
  R: "R",
};

export default function MetaDesign() {
  const { build, patch, setChampion, setLevel, addItem, removeItemAt, clearItems, maxItems } =
    useBuildState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [champQuery, setChampQuery] = useState("");

  useEffect(() => {
    document.title = "Meta · Wild Rift Builder";
  }, []);

  const champion = build.championId ? getChampion(build.championId) : undefined;
  const buildItems = useMemo(() => getItems(build.itemIds), [build.itemIds]);
  const totals = useMemo(
    () => (champion ? computeBuild(champion, build.level, buildItems) : null),
    [champion, build.level, buildItems],
  );
  const query = encodeBuild(build);
  const full = build.itemIds.length >= maxItems;
  const showPicker = !champion || pickerOpen;

  function pick(id: string) {
    setChampion(id);
    setPickerOpen(false);
    setChampQuery("");
  }

  return (
    <div className="min-h-screen bg-meta-bg font-sans text-meta-text" style={{ colorScheme: "light" }}>
      <div className="flex">
        <Rail
          onChampions={() => setPickerOpen(true)}
          championsActive={showPicker}
        />

        <div className="min-w-0 flex-1">
          <TopBar
            patch={patch}
            query={query}
            search={champQuery}
            onSearch={(v) => {
              setChampQuery(v);
              setPickerOpen(true);
            }}
            onFocusSearch={() => setPickerOpen(true)}
          />

          <main className="mx-auto max-w-[80rem] px-3 py-4 sm:px-5">
            {showPicker ? (
              <ChampionGrid
                query={champQuery}
                onQuery={setChampQuery}
                selectedId={build.championId}
                onSelect={pick}
                canClose={Boolean(champion)}
                onClose={() => setPickerOpen(false)}
              />
            ) : (
              champion &&
              totals && (
                <>
                  <ChampionHeader
                    champion={champion}
                    level={build.level}
                    onChange={() => setPickerOpen(true)}
                    query={query}
                  />
                  <Tabs />
                  <LevelBar level={build.level} onChange={setLevel} />
                  <StatStrip totals={totals} />

                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div className="min-w-0 space-y-3">
                      <BuildPath
                        items={buildItems}
                        maxItems={maxItems}
                        goldCost={totals.goldCost}
                        onRemove={removeItemAt}
                        onClear={clearItems}
                      />
                      <Shop onAdd={addItem} full={full} />
                    </div>
                    <aside className="space-y-3">
                      <StatPanel stats={totals.stats} attackSpeed={totals.attackSpeed} />
                    </aside>
                  </div>
                </>
              )
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ── Section title with U.GG-style accent bar ─────────────────────────── */

function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="h-4 w-1 rounded-full bg-gradient-to-b from-meta-blue to-meta-purple" />
        <h2 className="text-sm font-bold text-meta-text">{title}</h2>
        {sub && <span className="text-xs text-meta-mute">{sub}</span>}
      </div>
      {right}
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-meta-border bg-meta-panel shadow-soft ${className}`}
    >
      {children}
    </section>
  );
}

function Portrait({
  name,
  seed,
  color,
  size = 44,
  className = "",
}: {
  name: string;
  seed: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  const hue = hashHue(seed);
  const bg = color
    ? `linear-gradient(150deg, ${color}, ${color}88)`
    : `linear-gradient(150deg, hsl(${hue} 62% 48%), hsl(${(hue + 45) % 360} 60% 32%))`;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-md font-bold text-white ${className}`}
      style={{ background: bg, width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </span>
  );
}

/* ── Left rail ────────────────────────────────────────────────────────── */

function Rail({ onChampions, championsActive }: { onChampions: () => void; championsActive: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-14 shrink-0 flex-col items-center gap-1 border-r border-meta-border bg-meta-bg2 py-3 md:flex">
      <span className="mb-2 grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-meta-blue to-meta-purple text-sm font-extrabold text-white">
        WR
      </span>
      <RailBtn label="Builder" active={!championsActive}>
        <SwordIcon width={20} height={20} />
      </RailBtn>
      <RailBtn label="Champions" active={championsActive} onClick={onChampions}>
        <SearchIcon width={20} height={20} />
      </RailBtn>
    </aside>
  );
}

function RailBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`grid h-10 w-10 place-items-center rounded-md transition ${
        active ? "bg-meta-blue/15 text-meta-blue2" : "text-meta-dim hover:bg-meta-panel hover:text-meta-text"
      }`}
    >
      {children}
    </button>
  );
}

/* ── Top bar ──────────────────────────────────────────────────────────── */

function TopBar({
  patch,
  query,
  search,
  onSearch,
  onFocusSearch,
}: {
  patch: string;
  query: string;
  search: string;
  onSearch: (v: string) => void;
  onFocusSearch: () => void;
}) {
  const { copied, copy } = useShare();
  return (
    <header className="sticky top-0 z-30 border-b border-meta-border bg-meta-bg2/90 backdrop-blur">
      <div className="mx-auto flex max-w-[80rem] items-center gap-3 px-3 py-2.5 sm:px-5">
        <span className="text-sm font-extrabold tracking-tight text-meta-text md:hidden">
          WR Builder
        </span>
        <div className="relative mx-auto w-full max-w-md">
          <SearchIcon
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-meta-mute"
          />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={onFocusSearch}
            placeholder="Search champion…"
            className="w-full rounded-md border border-meta-border bg-meta-panel py-2 pl-9 pr-3 text-sm text-meta-text outline-none transition placeholder:text-meta-mute focus:border-meta-blue"
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`hidden rounded px-2.5 py-1 text-xs font-semibold sm:inline-flex ${
              patchMeta.verified ? "bg-meta-green/15 text-meta-green" : "bg-meta-gold/15 text-meta-gold"
            }`}
            title={patchMeta.verified ? "Data hand-verified" : "Sample data — not yet verified"}
          >
            Patch {patch}
          </span>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 rounded-md bg-meta-blue px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-meta-blue2"
          >
            {copied ? <CheckIcon width={15} height={15} /> : <ShareIcon width={15} height={15} />}
            {copied ? "Copied" : "Share"}
          </button>
          <DesignSwitcher current="meta" query={query} />
        </div>
      </div>
    </header>
  );
}

/* ── Champion header ──────────────────────────────────────────────────── */

function ChampionHeader({
  champion,
  level,
  onChange,
  query,
}: {
  champion: Champion;
  level: number;
  onChange: () => void;
  query: string;
}) {
  const abilityBySlot = new Map(champion.abilities.map((a) => [a.slot, a]));
  return (
    <Panel className="overflow-hidden">
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(420px 160px at 8% 0%, ${ITEM_CLASS_COLOR.ap}1f, transparent 70%)`,
          }}
        />
        <div className="relative flex flex-wrap items-center gap-4 p-4">
          <div className="relative">
            <Portrait name={champion.name} seed={champion.id} size={76} className="ring-2 ring-meta-border" />
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-meta-raised px-1.5 py-0.5 text-[10px] font-bold text-meta-gold ring-1 ring-meta-border">
              Lv {level}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight">{champion.name}</h1>
              <span className="text-sm text-meta-mute">{champion.title}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {champion.roles.map((r) => (
                <span
                  key={r}
                  className="rounded bg-meta-panel2 px-2 py-0.5 text-[11px] font-medium text-meta-mute ring-1 ring-meta-border"
                >
                  {r}
                </span>
              ))}
              <span className="text-[11px] text-meta-dim">·</span>
              <span className="text-[11px] capitalize text-meta-dim">{champion.resourceType} user</span>
            </div>

            <div className="mt-3 flex items-center gap-1.5">
              {ABILITY_SLOTS.map((slot) => {
                const a = abilityBySlot.get(slot);
                return (
                  <span
                    key={slot}
                    title={a ? `${SLOT_LABEL[slot]} · ${a.name}: ${a.description}` : `${SLOT_LABEL[slot]} (no data)`}
                    className={`grid h-9 w-9 place-items-center rounded-md text-xs font-bold ring-1 transition ${
                      a
                        ? "bg-meta-panel2 text-meta-blue2 ring-meta-border"
                        : "bg-meta-bg2 text-meta-dim ring-meta-border/60"
                    }`}
                  >
                    {SLOT_LABEL[slot]}
                  </span>
                );
              })}
            </div>
          </div>

          <button
            onClick={onChange}
            className="self-start rounded-md border border-meta-border bg-meta-panel2 px-3 py-1.5 text-sm font-medium text-meta-text transition hover:border-meta-blue"
          >
            Change champion
          </button>
        </div>
      </div>
    </Panel>
  );
}

function Tabs() {
  const tabs = [
    { id: "build", label: "Build", active: true },
    { id: "stats", label: "Champion Stats", active: false },
  ];
  return (
    <div className="mt-3 flex items-center gap-5 border-b border-meta-border px-1">
      {tabs.map((t) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          className={`-mb-px border-b-2 py-2.5 text-sm font-semibold transition ${
            t.active
              ? "border-meta-blue text-meta-text"
              : "border-transparent text-meta-mute hover:text-meta-text"
          }`}
        >
          {t.label}
        </a>
      ))}
    </div>
  );
}

function LevelBar({ level, onChange }: { level: number; onChange: (n: number) => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-meta-border bg-meta-panel px-3 py-2.5 shadow-soft">
      <span className="text-xs font-semibold uppercase tracking-wide text-meta-mute">Level</span>
      <div className="flex items-center overflow-hidden rounded-md border border-meta-border">
        <button
          onClick={() => onChange(level - 1)}
          className="px-2.5 py-1 text-meta-mute transition hover:bg-meta-panel2 hover:text-meta-text"
          aria-label="Decrease level"
        >
          −
        </button>
        <span className="tabular w-8 bg-meta-panel2 py-1 text-center text-sm font-bold text-meta-text">
          {level}
        </span>
        <button
          onClick={() => onChange(level + 1)}
          className="px-2.5 py-1 text-meta-mute transition hover:bg-meta-panel2 hover:text-meta-text"
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
        onChange={(e) => onChange(Number(e.target.value))}
        className="meta-range h-1.5 max-w-xs flex-1"
        aria-label="Champion level"
      />
      <span className="text-xs text-meta-dim">Stats shown at level {level} of 15</span>
    </div>
  );
}

/* ── Stat strip (headline totals) ─────────────────────────────────────── */

function StatStrip({ totals }: { totals: ReturnType<typeof computeBuild> }) {
  const s = totals.stats;
  const cells: { label: string; value: string; accent?: string }[] = [
    { label: "Gold", value: formatGold(totals.goldCost), accent: "text-meta-gold" },
    { label: "Attack Dmg", value: formatStat("attackDamage", s.attackDamage ?? 0) },
    { label: "Ability Pwr", value: formatStat("abilityPower", s.abilityPower ?? 0) },
    { label: "Health", value: formatStat("maxHealth", s.maxHealth ?? 0) },
    { label: "Armor", value: formatStat("armor", s.armor ?? 0) },
    { label: "Magic Resist", value: formatStat("magicResist", s.magicResist ?? 0) },
    { label: "Atk Speed", value: totals.attackSpeed.toFixed(2) },
  ];
  return (
    <div className="mt-3 grid grid-cols-3 overflow-hidden rounded-lg border border-meta-border bg-meta-panel shadow-soft sm:grid-cols-4 lg:grid-cols-7">
      {cells.map((c, i) => (
        <div
          key={c.label}
          className={`px-3 py-2.5 ${i !== 0 ? "border-l border-meta-border" : ""} ${
            i >= 3 ? "border-t sm:border-t-0 lg:border-t-0" : ""
          } ${i === 4 ? "border-l sm:border-l" : ""}`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide text-meta-mute">
            {c.label}
          </div>
          <div className={`tabular mt-0.5 text-lg font-bold ${c.accent ?? "text-meta-text"}`}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Build path ───────────────────────────────────────────────────────── */

function BuildPath({
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
    <Panel className="p-4" >
      <SectionTitle
        title="Your Build"
        sub={`${buildItems.length}/${maxItems} items`}
        right={
          <div className="flex items-center gap-3">
            <span className="tabular flex items-center gap-1 text-sm font-bold text-meta-gold">
              <GoldIcon width={15} height={15} />
              {formatGold(goldCost)}
            </span>
            <button
              onClick={onClear}
              disabled={buildItems.length === 0}
              className="text-xs text-meta-mute transition hover:text-meta-coral disabled:opacity-30"
            >
              Clear
            </button>
          </div>
        }
      />
      <div className="mt-3 flex flex-wrap items-start gap-1.5">
        {slots.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {it ? (
              <button
                onClick={() => onRemove(i)}
                title={`Remove ${it.name}`}
                className="group flex w-16 flex-col items-center gap-1"
              >
                <span className="relative">
                  <Portrait name={it.name} seed={it.id} color={ITEM_CLASS_COLOR[itemClass(it)]} size={48} />
                  <span className="absolute inset-0 grid place-items-center rounded-md bg-meta-bg2/85 opacity-0 transition group-hover:opacity-100">
                    <XIcon width={16} height={16} className="text-meta-coral" />
                  </span>
                </span>
                <span className="line-clamp-1 text-center text-[10px] text-meta-mute">{it.name}</span>
              </button>
            ) : (
              <div className="flex w-16 flex-col items-center gap-1">
                <span className="grid h-12 w-12 place-items-center rounded-md border border-dashed border-meta-border text-meta-dim">
                  <PlusIcon width={16} height={16} />
                </span>
                <span className="text-[10px] text-meta-dim">empty</span>
              </div>
            )}
            {i < maxItems - 1 && (
              <ChevronRightIcon width={14} height={14} className="mb-4 shrink-0 text-meta-dim" />
            )}
          </div>
        ))}
      </div>
    </Panel>
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
    <Panel className="p-4">
      <SectionTitle
        title="Item Shop"
        right={
          <div className="relative">
            <SearchIcon
              width={14}
              height={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-meta-mute"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search items…"
              className="w-40 rounded-md border border-meta-border bg-meta-panel2 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-meta-blue"
            />
          </div>
        }
      />

      <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {STAT_FILTERS.map((f) => {
          const active = filters.has(f.key);
          return (
            <button
              key={f.key}
              onClick={() => toggle(f.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-meta-blue text-white"
                  : "border border-meta-border bg-meta-panel2 text-meta-mute hover:text-meta-text"
              }`}
            >
              <StatIcon statKey={f.key} width={13} height={13} />
              {f.label}
            </button>
          );
        })}
      </div>

      {full && (
        <p className="mt-3 rounded-md bg-meta-gold/10 px-3 py-2 text-xs text-meta-gold">
          Build is full (6/6) — remove an item to add another.
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((it) => (
          <ItemCard key={it.id} item={it} onAdd={onAdd} disabled={full} />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-meta-mute">No items match.</p>
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
  return (
    <button
      onClick={() => onAdd(item.id)}
      disabled={disabled}
      className="group flex flex-col rounded-md border border-meta-border bg-meta-panel2 p-2.5 text-left transition hover:border-meta-blue disabled:cursor-not-allowed disabled:opacity-40"
    >
      <div className="flex items-start gap-2.5">
        <Portrait name={item.name} seed={item.id} color={ITEM_CLASS_COLOR[itemClass(item)]} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-meta-text">{item.name}</div>
          <div className="flex items-center gap-1 text-xs font-medium text-meta-gold">
            <GoldIcon width={12} height={12} />
            {formatGold(item.cost)}
          </div>
        </div>
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-meta-raised text-meta-mute transition group-hover:bg-meta-blue group-hover:text-white">
          <PlusIcon width={14} height={14} />
        </span>
      </div>
      <ul className="mt-2 space-y-0.5">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-1.5 text-[11px] text-meta-text/80">
            <StatIcon statKey={l.key} width={12} height={12} className="text-meta-mute" />
            <span className="tabular font-medium">+{l.display}</span>
            <span className="text-meta-mute">{l.label}</span>
          </li>
        ))}
      </ul>
      {eff !== null && (
        <span
          className={`mt-2 inline-flex w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${
            eff >= 1 ? "bg-meta-green/15 text-meta-green" : "bg-meta-raised text-meta-mute"
          }`}
        >
          {Math.round(eff * 100)}% gold eff
        </span>
      )}
    </button>
  );
}

/* ── Stat panel (aside) ───────────────────────────────────────────────── */

function StatPanel({ stats, attackSpeed }: { stats: StatBlock; attackSpeed: number }) {
  const rows = statRows(stats, attackSpeed);
  const groups: StatGroup[] = ["offense", "defense", "utility"];
  return (
    <Panel className="p-4" >
      <div id="stats" className="-mt-16 pt-16" />
      <SectionTitle title="Champion Stats" sub="base + items" />
      <div className="mt-3 space-y-4">
        {groups.map((g) => {
          const gr = rows.filter((r) => r.group === g);
          if (gr.length === 0) return null;
          return (
            <div key={g}>
              <h3 className={`mb-1.5 text-[11px] font-bold uppercase tracking-wider ${GROUP_ACCENT[g]}`}>
                {GROUP_LABEL[g]}
              </h3>
              <div>
                {gr.map((r) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between border-b border-meta-border/60 py-1.5 text-sm last:border-0"
                  >
                    <span className="flex items-center gap-2 text-meta-text/80">
                      <StatIcon statKey={r.key} width={14} height={14} className="text-meta-mute" />
                      {r.label}
                    </span>
                    <span className="tabular font-bold text-meta-text">{r.display}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ── Champion grid (select) ───────────────────────────────────────────── */

function ChampionGrid({
  query,
  onQuery,
  selectedId,
  onSelect,
  canClose,
  onClose,
}: {
  query: string;
  onQuery: (v: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  canClose: boolean;
  onClose: () => void;
}) {
  const filtered = champions.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Champion Select</h1>
          <p className="text-sm text-meta-mute">Pick a champion to start building.</p>
        </div>
        {canClose && (
          <button
            onClick={onClose}
            className="rounded-md border border-meta-border bg-meta-panel px-3 py-1.5 text-sm text-meta-mute transition hover:text-meta-text"
          >
            Back to build
          </button>
        )}
      </div>

      <Panel className="p-4">
        <div className="relative mb-4 max-w-sm">
          <SearchIcon
            width={16}
            height={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-meta-mute"
          />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search champions…"
            className="w-full rounded-md border border-meta-border bg-meta-panel2 py-2 pl-9 pr-3 text-sm outline-none focus:border-meta-blue"
            autoFocus
          />
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="group flex flex-col items-center gap-1.5"
              title={`${c.name} — ${c.title}`}
            >
              <span className="relative">
                <Portrait
                  name={c.name}
                  seed={c.id}
                  size={72}
                  className={`transition group-hover:ring-2 ${
                    c.id === selectedId ? "ring-2 ring-meta-blue" : "ring-1 ring-meta-border group-hover:ring-meta-blue"
                  }`}
                />
              </span>
              <span
                className={`text-xs font-medium ${
                  c.id === selectedId ? "text-meta-blue2" : "text-meta-mute group-hover:text-meta-text"
                }`}
              >
                {c.name}
              </span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-meta-mute">No champions match.</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
