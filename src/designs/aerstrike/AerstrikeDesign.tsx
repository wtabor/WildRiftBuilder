"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { champions, getBuilds, getChampion, getItem, getItems, items, patchMeta } from "@/lib/data";
import { computeBuild, goldEfficiency, type BuildTotals } from "@/lib/stats/engine";
import { autoAttackDps, type AutoAttackDps } from "@/lib/damage/engine";
import { encodeBuild, useBuildState, type BuildKey, type TargetStats } from "@/state/buildState";
import { type Ability, type BuildPreset, type Champion, type Item, type StatBlock, type StatKey } from "@/lib/schema";
import { statRows, itemStatLines, GROUP_LABEL, type StatGroup } from "@/lib/statDisplay";
import { formatStat, formatGold } from "@/lib/format";
import { initials, championIconUrl, itemIconUrl } from "@/lib/visual";
import { useShare } from "@/lib/useShare";
import { useAnimatedNumber, useIncreaseFlash, useInView } from "./motion";
import { CompareItemsModal } from "./CompareItemsModal";
import "./aerstrike.css";

/* AerStrike visual language applied to the Wild Rift Builder. Presentation
   only — every number, gold figure, and DPS still comes from src/lib. */

/* The reactor is code-split and client-only (three.js): keeps it out of the
   initial bundle and off the SSR path. */
const ReactorCore = dynamic(() => import("./ReactorCore"), {
  ssr: false,
  loading: () => <div className="ae-reactor" aria-hidden="true" />,
});

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const clampRange = (n: number, a: number, b: number) => (n < a ? a : n > b ? b : n);

const STAT_FILTERS: { key: StatKey; label: string }[] = [
  { key: "attackDamage", label: "AD" },
  { key: "abilityPower", label: "AP" },
  { key: "attackSpeed", label: "Atk Spd" },
  { key: "critChance", label: "Crit" },
  { key: "armor", label: "Armor" },
  { key: "magicResist", label: "MR" },
  { key: "maxHealth", label: "Health" },
  { key: "abilityHaste", label: "Haste" },
];

const ABILITY_SLOTS: Ability["slot"][] = ["passive", "Q", "W", "E", "R"];
const SLOT_LABEL: Record<Ability["slot"], string> = { passive: "P", Q: "Q", W: "W", E: "E", R: "R" };

export default function AerstrikeDesign() {
  const {
    build, patch, setChampion, setLevel, loadBuild, addItem, removeItemAt, clearItems,
    setBoots, removeBoots, setEnchant, removeEnchant, setActive, setTarget, toggleCompare, maxItems,
  } = useBuildState();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [champQuery, setChampQuery] = useState("");
  const [compareItemsOpen, setCompareItemsOpen] = useState(false);

  useEffect(() => {
    document.title = "Wild Rift Builder — stat & build calculator";
  }, []);

  const champion = build.championId ? getChampion(build.championId) : undefined;
  const buildItems = useMemo(() => getItems(build.itemIds), [build.itemIds]);
  const buildItemsB = useMemo(() => getItems(build.itemIdsB), [build.itemIdsB]);
  const boots = build.bootsId ? getItem(build.bootsId) : undefined;
  const bootsB = build.bootsIdB ? getItem(build.bootsIdB) : undefined;
  const enchant = build.enchantId ? getItem(build.enchantId) : undefined;
  const enchantB = build.enchantIdB ? getItem(build.enchantIdB) : undefined;
  const allItems = useMemo(
    () => [...buildItems, boots, enchant].filter((i): i is Item => Boolean(i)),
    [buildItems, boots, enchant],
  );
  const allItemsB = useMemo(
    () => [...buildItemsB, bootsB, enchantB].filter((i): i is Item => Boolean(i)),
    [buildItemsB, bootsB, enchantB],
  );
  const totals = useMemo(
    () => (champion ? computeBuild(champion, build.level, allItems) : null),
    [champion, build.level, allItems],
  );
  const totalsB = useMemo(
    () => (champion && build.compare ? computeBuild(champion, build.level, allItemsB) : null),
    [champion, build.level, allItemsB, build.compare],
  );
  const dps = useMemo(
    () =>
      totals
        ? autoAttackDps({ stats: totals.stats, attackSpeed: totals.attackSpeed, level: build.level, items: allItems }, build.target)
        : null,
    [totals, build.level, allItems, build.target],
  );
  const dpsB = useMemo(
    () =>
      totalsB
        ? autoAttackDps({ stats: totalsB.stats, attackSpeed: totalsB.attackSpeed, level: build.level, items: allItemsB }, build.target)
        : null,
    [totalsB, build.level, allItemsB, build.target],
  );
  // Reactor readout mapping — presentation-only params derived from the shared
  // engine totals/dps (never the reverse). Reflects the primary build (A).
  const reactor = useMemo(() => {
    if (!totals) return { power: 0, physicalShare: 1, energy: 0, spin: 0.2, shards: 0 };
    const st = totals.stats;
    // Hue reads the build's damage identity (AD vs AP), not the auto-attack
    // breakdown — autos are physical for almost everyone, so AD/AP is the
    // signal that actually swings a mage's core teal.
    const ad = st.attackDamage ?? 0;
    const ap = st.abilityPower ?? 0;
    const share = ad + ap > 0 ? ad / (ad + ap) : 1;
    return {
      power: clamp01(totals.goldCost / 15000),
      physicalShare: share,
      energy: clamp01((dps?.dps ?? 0) / 700),
      spin: clampRange((totals.attackSpeed - 0.6) / 1.4, 0.05, 1.2),
      shards: Math.min(allItems.length, 6),
    };
  }, [totals, dps, allItems]);

  const query = encodeBuild(build);
  const activeList = build.active === "B" ? build.itemIdsB : build.itemIds;
  const activeBoots = build.active === "B" ? build.bootsIdB : build.bootsId;
  const activeEnchant = build.active === "B" ? build.enchantIdB : build.enchantId;
  const full = activeList.length >= maxItems;
  const showPicker = !champion || pickerOpen;

  // Curated "standing builds" for this champion. When present they take the
  // first section slot, pushing the rest down by one (so numbering stays 01-N).
  const presets = champion ? getBuilds(champion.id) : [];
  const sectionOffset = presets.length > 0 ? 1 : 0;
  const sn = (i: number) => String(i + sectionOffset).padStart(2, "0");

  function handleAdd(id: string) {
    const slot = getItem(id)?.slot;
    if (slot === "boots") setBoots(id);
    else if (slot === "enchant") setEnchant(id);
    else addItem(id);
  }

  const ownedIds = useMemo(
    () => [...activeList, activeBoots, activeEnchant].filter((x): x is string => Boolean(x)),
    [activeList, activeBoots, activeEnchant],
  );

  function pick(id: string) {
    setChampion(id);
    setPickerOpen(false);
    setChampQuery("");
  }

  return (
    <div className="ae-root">
      <Nav
        patch={patch}
        search={champQuery}
        onSearch={(v) => {
          setChampQuery(v);
          setPickerOpen(true);
        }}
        onFocusSearch={() => setPickerOpen(true)}
        onCompareItems={() => setCompareItemsOpen(true)}
      />
      <CompareItemsModal
        open={compareItemsOpen}
        onClose={() => setCompareItemsOpen(false)}
        defaultChampionId={build.championId}
      />

      <Ticker champion={champion} patch={patch} dps={dps} goldCost={totals?.goldCost ?? 0} />

      <main className="relative z-10 mx-auto max-w-[88rem] px-4 py-10">
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
            <div className="space-y-8">
              <Reveal>
                <HeroBand
                  champion={champion}
                  level={build.level}
                  totals={totals}
                  dps={dps}
                  reactor={reactor}
                  onChange={() => setPickerOpen(true)}
                />
              </Reveal>

              {presets.length > 0 && (
                <Reveal delay={80}>
                  <section>
                    <Eyebrow
                      n="01"
                      label="Standing builds"
                      right={build.compare ? <span className="ae-chip ae-chip--teal">→ Build {build.active}</span> : undefined}
                    />
                    <StandingBuilds presets={presets} onLoad={loadBuild} targetKey={build.compare ? build.active : undefined} />
                  </section>
                </Reveal>
              )}

              {/* Console work area: inputs · build actions · stat readout */}
              <div className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)_20rem]">
                <div className="space-y-8">
                  <Reveal>
                    <section>
                      <Eyebrow n={sn(1)} label="Level" />
                      <LevelBar level={build.level} onChange={setLevel} />
                    </section>
                  </Reveal>
                  <Reveal delay={60}>
                    <section>
                      <Eyebrow n={sn(2)} label="Target dummy" />
                      <TargetDummy target={build.target} onChange={setTarget} />
                    </section>
                  </Reveal>
                </div>

                <div className="min-w-0 space-y-8">
                  <Reveal delay={40}>
                    <section>
                      <Eyebrow
                        n={sn(3)}
                        label={build.compare ? "Build A" : "Your build"}
                        right={
                          <button
                            onClick={toggleCompare}
                            className={`ae-btn ${build.compare ? "ae-btn--primary" : ""}`}
                            title="Build a second build side-by-side and compare stats + DPS"
                          >
                            {build.compare ? "Comparing A/B" : "Compare A/B"}
                            <span className="ae-arrow">{build.compare ? "✕" : "+"}</span>
                          </button>
                        }
                      />
                      <BuildPath
                        items={buildItems}
                        boots={boots ?? null}
                        enchant={enchant ?? null}
                        maxItems={maxItems}
                        goldCost={totals.goldCost}
                        onRemove={(i) => removeItemAt("A", i)}
                        onRemoveBoots={() => removeBoots("A")}
                        onRemoveEnchant={() => removeEnchant("A")}
                        onClear={() => clearItems("A")}
                        active={build.compare && build.active === "A"}
                        onFocus={build.compare ? () => setActive("A") : undefined}
                      />
                      {build.compare && totalsB && (
                        <div className="mt-4">
                          <div className="ae-eyebrow mb-2">Build B</div>
                          <BuildPath
                            items={buildItemsB}
                            boots={bootsB ?? null}
                            enchant={enchantB ?? null}
                            maxItems={maxItems}
                            goldCost={totalsB.goldCost}
                            onRemove={(i) => removeItemAt("B", i)}
                            onRemoveBoots={() => removeBoots("B")}
                            onRemoveEnchant={() => removeEnchant("B")}
                            onClear={() => clearItems("B")}
                            active={build.active === "B"}
                            onFocus={() => setActive("B")}
                          />
                        </div>
                      )}
                    </section>
                  </Reveal>

                  <Reveal delay={80}>
                    <section>
                      <Eyebrow
                        n={sn(4)}
                        label="Item shop"
                        right={build.compare ? <span className="ae-chip ae-chip--teal">→ Build {build.active}</span> : undefined}
                      />
                      <Shop
                        onAdd={handleAdd}
                        full={full}
                        ownedIds={ownedIds}
                        hasBoots={Boolean(activeBoots)}
                      />
                    </section>
                  </Reveal>
                </div>

                <Reveal delay={120}>
                  <section>
                    <Eyebrow n={sn(5)} label="Stat sheet" />
                    {build.compare && totalsB && dps && dpsB ? (
                      <CompareStatPanel a={totals} b={totalsB} dpsA={dps} dpsB={dpsB} />
                    ) : (
                      dps && <StatPanel stats={totals.stats} attackSpeed={totals.attackSpeed} items={allItems} dps={dps} />
                    )}
                  </section>
                </Reveal>
              </div>
            </div>
          )
        )}

        <Footer patch={patch} query={query} />
      </main>
    </div>
  );
}

/* ── Eyebrow / section label ──────────────────────────────────────────── */

function Eyebrow({ n, label, right }: { n: string; label: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <div className="ae-eyebrow">
          <span className="ae-eyebrow-accent">{n}/</span> {label}
        </div>
        <div className="ae-tick mt-2" />
      </div>
      {right}
    </div>
  );
}

/* ── Standing builds (curated presets) ────────────────────────────────── */

function StandingBuilds({
  presets,
  onLoad,
  targetKey,
}: {
  presets: BuildPreset[];
  onLoad: (p: BuildPreset) => void;
  /** Which build ("A"/"B") a load will fill; undefined when not comparing. */
  targetKey?: BuildKey;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {presets.map((p) => (
        <PresetCard key={p.id} preset={p} onLoad={onLoad} targetKey={targetKey} />
      ))}
    </div>
  );
}

function PresetCard({
  preset,
  onLoad,
  targetKey,
}: {
  preset: BuildPreset;
  onLoad: (p: BuildPreset) => void;
  targetKey?: BuildKey;
}) {
  const boots = preset.boots ? getItem(preset.boots) : undefined;
  const coreItems = getItems(preset.items);
  return (
    <button onClick={() => onLoad(preset)} className="ae-item group">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-[var(--ae-fg)]">{preset.name}</span>
        <span className={`ae-chip ${preset.meme ? "ae-chip--teal" : "ae-chip--accent"}`}>
          {preset.meme ? "for fun" : preset.archetype}
        </span>
      </div>
      <p className="mt-1.5 min-h-[3.6em] text-xs leading-relaxed text-[var(--ae-fg-dim)]">
        {preset.description}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1">
        {boots && (
          <Portrait name={boots.name} src={boots.icon ? itemIconUrl(boots.icon) : undefined} size={26} />
        )}
        {coreItems.map((it) => (
          <Portrait key={it.id} name={it.name} src={it.icon ? itemIconUrl(it.icon) : undefined} size={26} />
        ))}
      </div>
      <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-[var(--ae-accent)]">
        {targetKey ? `Load into build ${targetKey}` : "Load build"} <span className="ae-arrow">→</span>
      </span>
    </button>
  );
}

/* ── Portrait (square monogram box + optional CDN art) ────────────────── */

function Portrait({
  name,
  size = 44,
  className = "",
  src,
}: {
  name: string;
  size?: number;
  className?: string;
  src?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`ae-portrait ${className}`} style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {initials(name)}
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

/* ── Nav ──────────────────────────────────────────────────────────────── */

function Nav({
  patch,
  search,
  onSearch,
  onFocusSearch,
  onCompareItems,
}: {
  patch: string;
  search: string;
  onSearch: (v: string) => void;
  onFocusSearch: () => void;
  onCompareItems: () => void;
}) {
  const { copied, copy } = useShare();
  const clock = useUtcClock();
  return (
    <header className="ae-nav">
      <div className="mx-auto flex h-14 max-w-[88rem] items-center gap-4 px-4">
        <span className="inline-flex items-center gap-2.5">
          <span className="ae-pulse" />
          <span className="text-[13px] font-bold tracking-[0.18em] text-[var(--ae-fg)]">
            WILD RIFT BUILDER<span className="ae-dot">.</span>
          </span>
        </span>
        <span className="ae-nav__utc ml-1 hidden text-[11px] tracking-[0.18em] text-[var(--ae-fg-muted)] lg:inline">
          UTC <b className="font-normal text-[var(--ae-accent-secondary)]">{clock}</b>
        </span>

        <div className="ml-auto flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            onFocus={onFocusSearch}
            placeholder="SEARCH CHAMPION →"
            className="ae-input hidden w-56 sm:block"
            aria-label="Search champion"
          />
          <span
            className={`ae-chip ${patchMeta.verified ? "ae-chip--teal" : "ae-chip--accent"}`}
            title={patchMeta.verified ? "Data hand-verified" : "Sample data — not yet verified"}
          >
            Patch {patch}
          </span>
          <button onClick={onCompareItems} className="ae-btn hidden sm:inline-flex" title="Ask AI which of two items is better for a champion">
            Compare items
            <span className="ae-arrow">✦</span>
          </button>
          <button onClick={copy} className="ae-btn ae-btn--primary">
            {copied ? "Copied" : "Share"}
            <span className="ae-arrow">↗</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function useUtcClock() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(11, 19));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/* ── Ticker ───────────────────────────────────────────────────────────── */

function Ticker({
  champion,
  patch,
  dps,
  goldCost,
}: {
  champion: Champion | undefined;
  patch: string;
  dps: AutoAttackDps | null;
  goldCost: number;
}) {
  const stats: [string, string][] = [
    ["PATCH", patch],
    ["ROSTER", `${champions.length} CHAMPIONS`],
    ["ITEMS", `${items.length} ITEMS`],
    ["CHAMPION", champion?.name?.toUpperCase() ?? "—"],
    ["BUILD COST", formatGold(goldCost)],
    ["AUTO DPS", dps ? Math.round(dps.dps).toLocaleString("en-US") : "—"],
    ["DATA", patchMeta.verified ? "VERIFIED" : "SAMPLE"],
  ];
  const run = [...stats, ...stats];
  return (
    <div className="ae-ticker relative z-10">
      <div className="ae-ticker__track">
        {run.map(([k, v], i) => (
          <span key={i} className="ae-ticker__item">
            <span className="ae-ticker__k">{k}/</span> <b>{v}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Reveal (scroll-in, once) ─────────────────────────────────────────── */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, shown] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`ae-reveal ${shown ? "ae-reveal--in" : ""} ${className}`}
      style={delay ? ({ "--ae-reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}

/* ── Hero band — identity · reactor core · live HUD readout ────────────── */

function HeroBand({
  champion,
  level,
  totals,
  dps,
  reactor,
  onChange,
}: {
  champion: Champion;
  level: number;
  totals: BuildTotals;
  dps: AutoAttackDps | null;
  reactor: { power: number; physicalShare: number; energy: number; spin: number; shards: number };
  onChange: () => void;
}) {
  const abilityBySlot = new Map(champion.abilities.map((a) => [a.slot, a]));
  const s = totals.stats;
  return (
    <section className="ae-panel ae-panel--corner ae-panel--accent ae-hero">
      <div className="ae-hero__zone ae-hero__identity">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Portrait
              name={champion.name}
              src={champion.icon ? championIconUrl(champion.icon) : undefined}
              size={72}
            />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 border border-[var(--ae-accent)] bg-[var(--ae-bg)] px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-[var(--ae-accent)]">
              LV {level}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="ae-eyebrow mb-1">
              <span className="ae-eyebrow-accent">00/</span> Champion
            </div>
            <h1 className="text-[2rem] font-bold leading-[0.95] tracking-[-0.03em] text-[var(--ae-fg)]">
              {champion.name}
              <span className="ae-dot">.</span>
            </h1>
            <p className="mt-1 text-sm text-[var(--ae-fg-dim)]">{champion.title}</p>
          </div>
          <button onClick={onChange} className="ae-btn shrink-0">
            Change <span className="ae-arrow">→</span>
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {champion.roles.map((r) => (
            <span key={r} className="ae-tag">
              {r}
            </span>
          ))}
          <span className="ae-tag ae-chip--teal border-[var(--ae-border-strong)] text-[var(--ae-accent-secondary)]">
            {champion.resourceType}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {ABILITY_SLOTS.map((slot) => {
            const a = abilityBySlot.get(slot);
            const on = Boolean(a);
            const ult = slot === "R";
            return (
              <span
                key={slot}
                title={a ? `${SLOT_LABEL[slot]} · ${a.name}: ${a.description}` : `${SLOT_LABEL[slot]} (no data)`}
                className="grid h-9 w-9 place-items-center border text-xs font-bold"
                style={{
                  borderColor: !on ? "var(--ae-border)" : ult ? "var(--ae-accent)" : "var(--ae-border-strong)",
                  color: !on ? "var(--ae-fg-subtle)" : ult ? "var(--ae-accent)" : "var(--ae-accent-secondary)",
                }}
              >
                {SLOT_LABEL[slot]}
              </span>
            );
          })}
        </div>
      </div>

      <div className="ae-hero__reactor">
        <ReactorCore
          power={reactor.power}
          physicalShare={reactor.physicalShare}
          energy={reactor.energy}
          spin={reactor.spin}
          shards={reactor.shards}
        />
      </div>

      <div className="ae-hero__zone">
        <div className="ae-eyebrow mb-3 flex items-center gap-2">
          <span className="ae-pulse" />
          <span><span className="ae-eyebrow-accent">RT/</span> Live readout</span>
        </div>
        <div className="ae-hud">
          <HudStat label="Auto DPS" value={dps?.dps ?? 0} render={(n) => Math.round(n).toLocaleString("en-US")} accent="var(--ae-accent)" />
          <HudStat label="Build cost" value={totals.goldCost} render={(n) => formatGold(Math.round(n))} accent="var(--ae-accent-tertiary)" />
          <HudStat label="Attack dmg" value={s.attackDamage ?? 0} render={(n) => formatStat("attackDamage", n)} />
          <HudStat label="Ability pwr" value={s.abilityPower ?? 0} render={(n) => formatStat("abilityPower", n)} />
        </div>
      </div>
    </section>
  );
}

/* One HUD figure — count-up + a one-shot flash when it rises. */
function HudStat({
  label,
  value,
  render,
  accent,
}: {
  label: string;
  value: number;
  render: (n: number) => string;
  accent?: string;
}) {
  const n = useAnimatedNumber(value);
  const flash = useIncreaseFlash(value);
  return (
    <div className="ae-hud__cell">
      <div className="ae-hud__k">{label}</div>
      <div className={`ae-hud__v ae-num ${flash ? "ae-flash" : ""}`} style={accent ? { color: accent } : undefined}>
        {render(n)}
      </div>
    </div>
  );
}

/* ── Level ────────────────────────────────────────────────────────────── */

function LevelBar({ level, onChange }: { level: number; onChange: (n: number) => void }) {
  return (
    <div className="ae-panel flex flex-wrap items-center gap-4 p-4">
      <button
        onClick={() => onChange(1)}
        aria-label="Set level 1"
        aria-pressed={level === 1}
        className={`ae-lvl ae-num ${level === 1 ? "ae-lvl--on" : ""}`}
      >
        1
      </button>
      <input
        type="range"
        min={1}
        max={15}
        value={level}
        onChange={(e) => onChange(Number(e.target.value))}
        className="ae-range max-w-[16rem] flex-1"
        aria-label="Champion level"
      />
      <button
        onClick={() => onChange(15)}
        aria-label="Set max level"
        aria-pressed={level === 15}
        className={`ae-lvl ae-lvl--wide ae-num ${level === 15 ? "ae-lvl--on" : ""}`}
      >
        MAX
      </button>
      <span className="ae-meta">
        Lvl <span className="ae-num text-[var(--ae-accent)]">{level}</span> / 15
      </span>
    </div>
  );
}

/* ── Build path ───────────────────────────────────────────────────────── */

function BuildPath({
  items: buildItems,
  boots = null,
  enchant = null,
  maxItems,
  goldCost,
  onRemove,
  onRemoveBoots,
  onRemoveEnchant,
  onClear,
  active = false,
  onFocus,
}: {
  items: Item[];
  boots?: Item | null;
  enchant?: Item | null;
  maxItems: number;
  goldCost: number;
  onRemove: (i: number) => void;
  onRemoveBoots?: () => void;
  onRemoveEnchant?: () => void;
  onClear: () => void;
  active?: boolean;
  onFocus?: () => void;
}) {
  const slots = Array.from({ length: maxItems }, (_, i) => buildItems[i] ?? null);
  return (
    <div
      onClick={onFocus}
      className={`ae-panel p-4 ${onFocus ? "cursor-pointer" : ""} ${active ? "ae-panel--accent ae-panel--corner" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="ae-meta">
          {buildItems.length}/{maxItems} items{boots ? " + boots" : ""}{enchant ? " + enchant" : ""}
          {active && <span className="ae-chip ae-chip--accent ml-2">Adding here</span>}
        </span>
        <div className="flex items-center gap-3">
          <span className="ae-num text-sm font-bold text-[var(--ae-accent-tertiary)]">{formatGold(goldCost)} G</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            disabled={buildItems.length === 0}
            className="ae-meta transition-colors hover:text-[var(--ae-accent)] disabled:opacity-30"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <div className="flex items-center gap-2">
          {boots ? (
            <div className="flex w-16 flex-col items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveBoots?.();
                }}
                title={`Remove ${boots.name}`}
                className="group relative block"
              >
                <Portrait name={boots.name} src={boots.icon ? itemIconUrl(boots.icon) : undefined} size={48} />
                <span className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--ae-bg)_82%,transparent)] text-[var(--ae-accent)] opacity-0 transition group-hover:opacity-100">
                  ✕
                </span>
                {enchant && (
                  <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center border border-[var(--ae-accent)] bg-[var(--ae-bg)] text-[9px] font-bold text-[var(--ae-accent)]">
                    ✦
                  </span>
                )}
              </button>
              <span className="line-clamp-1 text-center text-[11px] text-[var(--ae-fg-subtle)]">
                {enchant ? enchant.name : boots.name}
              </span>
            </div>
          ) : (
            <div className="flex w-16 flex-col items-center gap-1">
              <span className="ae-slot h-12 w-12 border-[color-mix(in_srgb,var(--ae-accent)_40%,transparent)] text-[var(--ae-accent)]">
                ⌂
              </span>
              <span className="text-[11px] text-[var(--ae-accent)]">boots</span>
            </div>
          )}
          <span className="mb-4 h-8 w-px self-center bg-[var(--ae-border)]" />
        </div>

        {slots.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            {it ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
                title={`Remove ${it.name}`}
                className="group flex w-16 flex-col items-center gap-1"
              >
                <span className="relative">
                  <Portrait name={it.name} src={it.icon ? itemIconUrl(it.icon) : undefined} size={48} />
                  <span className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--ae-bg)_82%,transparent)] text-[var(--ae-accent)] opacity-0 transition group-hover:opacity-100">
                    ✕
                  </span>
                </span>
                <span className="line-clamp-1 text-center text-[11px] text-[var(--ae-fg-subtle)]">{it.name}</span>
              </button>
            ) : (
              <div className="flex w-16 flex-col items-center gap-1">
                <span className="ae-slot h-12 w-12">+</span>
                <span className="text-[11px] text-[var(--ae-fg-subtle)]">empty</span>
              </div>
            )}
            {i < maxItems - 1 && <span className="ae-arrow mb-4 text-[var(--ae-fg-subtle)]">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shop ─────────────────────────────────────────────────────────────── */

function Shop({
  onAdd,
  full,
  ownedIds,
  hasBoots,
}: {
  onAdd: (id: string) => void;
  full: boolean;
  ownedIds: string[];
  hasBoots: boolean;
}) {
  const owned = useMemo(() => new Set(ownedIds), [ownedIds]);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Set<StatKey>>(new Set());

  function toggle(k: StatKey) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
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
    <div className="ae-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {STAT_FILTERS.map((f) => {
            const on = filters.has(f.key);
            return (
              <button key={f.key} onClick={() => toggle(f.key)} className={`ae-chip ${on ? "ae-chip--accent" : ""}`}>
                {f.label}
              </button>
            );
          })}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SEARCH ITEMS"
          className="ae-input w-40"
          aria-label="Search items"
        />
      </div>

      {full && (
        <p className="mt-3 border border-[color-mix(in_srgb,var(--ae-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--ae-accent)_8%,transparent)] px-3 py-2 text-xs text-[var(--ae-accent)]">
          Build is full (6/6) — remove an item to add another.
        </p>
      )}

      <div className="mt-4 grid max-h-[42rem] grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((it) => {
          const isOwned = owned.has(it.id);
          const isBootsLike = it.slot === "boots" || it.slot === "enchant";
          const disabled = isOwned || (full && !isBootsLike) || (it.slot === "enchant" && !hasBoots);
          return (
            <ItemCard
              key={it.id}
              item={it}
              onAdd={onAdd}
              disabled={disabled}
              owned={isOwned}
              note={it.slot === "enchant" && !hasBoots ? "Needs boots" : undefined}
            />
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-[var(--ae-fg-muted)]">No items match.</p>
        )}
      </div>
    </div>
  );
}

function ItemCard({
  item,
  onAdd,
  disabled,
  owned,
  note,
}: {
  item: Item;
  onAdd: (id: string) => void;
  disabled: boolean;
  owned?: boolean;
  note?: string;
}) {
  const eff = goldEfficiency(item);
  const lines = itemStatLines(item);
  return (
    <button onClick={() => onAdd(item.id)} disabled={disabled} className="ae-item group">
      <div className="flex items-start gap-2.5">
        <Portrait name={item.name} src={item.icon ? itemIconUrl(item.icon) : undefined} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-[var(--ae-fg)]">{item.name}</div>
          <div className="ae-num text-xs font-medium text-[var(--ae-accent-tertiary)]">{formatGold(item.cost)} G</div>
        </div>
        {owned ? (
          <span className="ae-chip ae-chip--teal shrink-0">Owned</span>
        ) : note ? (
          <span className="ae-chip shrink-0">{note}</span>
        ) : (
          <span className="ae-arrow shrink-0 text-[var(--ae-accent)] transition group-hover:translate-x-0.5">→</span>
        )}
      </div>
      <ul className="mt-2.5 space-y-1">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-2 text-[11.5px] text-[var(--ae-fg-dim)]">
            <span className="ae-num font-semibold text-[var(--ae-fg)]">+{l.display}</span>
            <span className="text-[var(--ae-fg-dim)]">{l.label}</span>
          </li>
        ))}
      </ul>
      {item.effects.length > 0 && (
        <ul className="mt-2.5 space-y-1.5 border-t border-[var(--ae-border)] pt-2.5">
          {item.effects.map((e) => (
            <li key={e.name} className="text-[11.5px] leading-relaxed text-[var(--ae-fg-dim)]">
              <span className="font-bold text-[var(--ae-fg)]">{e.name}</span> {e.description}
            </li>
          ))}
        </ul>
      )}
      {eff !== null && (
        <span
          className="ae-chip mt-2.5 w-fit"
          style={
            eff >= 1
              ? { color: "var(--ae-accent-secondary)", borderColor: "var(--ae-border-strong)" }
              : undefined
          }
        >
          {Math.round(eff * 100)}% gold eff
        </span>
      )}
    </button>
  );
}

/* ── Target dummy ─────────────────────────────────────────────────────── */

function TargetDummy({ target, onChange }: { target: TargetStats; onChange: (patch: Partial<TargetStats>) => void }) {
  const fields: { key: keyof TargetStats; label: string }[] = [
    { key: "armor", label: "Armor" },
    { key: "magicResist", label: "Magic Resist" },
    { key: "maxHealth", label: "Health" },
  ];
  return (
    <div className="ae-panel p-4">
      <p className="ae-meta mb-3">Enemy to hit</p>
      <div className="grid grid-cols-3 gap-2">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ae-fg-subtle)]">{f.label}</span>
            <input
              type="number"
              min={0}
              value={target[f.key]}
              onChange={(e) => onChange({ [f.key]: Number(e.target.value) } as Partial<TargetStats>)}
              className="ae-input ae-num"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/* ── Damage readout ───────────────────────────────────────────────────── */

function DamageReadout({ dps }: { dps: AutoAttackDps }) {
  const { physical, magic, trueDamage } = dps.breakdown;
  const parts = [
    { label: "Physical", value: physical, color: "var(--ae-accent)" },
    { label: "Magic", value: magic, color: "var(--ae-accent-secondary)" },
    { label: "True", value: trueDamage, color: "var(--ae-fg)" },
  ].filter((p) => p.value > 0.5);
  return (
    <div className="mt-4 border-t border-[var(--ae-border)] pt-3">
      <h3 className="ae-eyebrow ae-eyebrow-accent">Auto-attack damage</h3>
      <p className="mb-2 mt-1 text-[11px] text-[var(--ae-fg-subtle)]">
        Sustained, incl. crit &amp; on-hit, vs the target dummy.
      </p>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-[var(--ae-fg-dim)]">DPS</span>
        <span className="ae-num text-2xl font-bold text-[var(--ae-accent)]">
          {Math.round(dps.dps).toLocaleString("en-US")}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--ae-fg-muted)]">
        <span>{dps.perHit.toFixed(0)} per hit</span>
        <span>{dps.attacksPerSecond.toFixed(2)} atk/s</span>
      </div>
      <ul className="mt-2 space-y-0.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center justify-between text-[11px]">
            <span className="text-[var(--ae-fg-muted)]">{p.label} / hit</span>
            <span className="ae-num font-semibold" style={{ color: p.color }}>
              {p.value.toFixed(0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Stat panel ───────────────────────────────────────────────────────── */

function StatPanel({
  stats,
  attackSpeed,
  items: buildItems,
  dps,
}: {
  stats: StatBlock;
  attackSpeed: number;
  items: Item[];
  dps: AutoAttackDps;
}) {
  const rows = statRows(stats, attackSpeed);
  const groups: StatGroup[] = ["offense", "defense", "utility"];
  return (
    <div className="ae-panel p-4">
      <div className="space-y-4">
        {groups.map((g) => {
          const gr = rows.filter((r) => r.group === g);
          if (gr.length === 0) return null;
          return (
            <div key={g}>
              <h3 className="ae-eyebrow ae-eyebrow-accent mb-1.5">{GROUP_LABEL[g]}</h3>
              <div>
                {gr.map((r) => (
                  <div
                    key={r.key}
                    className="flex items-center justify-between border-b border-[var(--ae-border)] py-1.5 text-sm last:border-0"
                  >
                    <span className="text-[var(--ae-fg-dim)]">{r.label}</span>
                    <span className="ae-num font-bold text-[var(--ae-fg)]">{r.display}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <DamageReadout dps={dps} />
      <CombatEffects items={buildItems} />
    </div>
  );
}

/* ── Combat effects ───────────────────────────────────────────────────── */

type BuildEffect = { itemId: string; itemName: string; name: string; kind: "passive" | "active"; description: string };

function collectEffects(list: Item[]): BuildEffect[] {
  const out: BuildEffect[] = [];
  for (const it of list) {
    for (const e of it.effects) {
      out.push({ itemId: it.id, itemName: it.name, name: e.name, kind: e.kind, description: e.description });
    }
  }
  return out;
}

function EffectRow({ e }: { e: BuildEffect }) {
  return (
    <li className="leading-snug">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="border px-1 py-px text-[8px] font-bold uppercase tracking-[0.1em]"
          style={
            e.kind === "active"
              ? { color: "var(--ae-accent)", borderColor: "color-mix(in srgb, var(--ae-accent) 40%, transparent)" }
              : { color: "var(--ae-accent-secondary)", borderColor: "var(--ae-border-strong)" }
          }
        >
          {e.kind === "active" ? "Act" : "Pas"}
        </span>
        <span className="font-semibold text-[var(--ae-fg-soft)]">{e.name}</span>
        <span className="text-[9px] text-[var(--ae-fg-subtle)]">· {e.itemName}</span>
      </span>
      <span className="block text-[11px] text-[var(--ae-fg-muted)]">{e.description}</span>
    </li>
  );
}

function CombatEffects({ items: list }: { items: Item[] }) {
  const effects = useMemo(() => collectEffects(list), [list]);
  if (effects.length === 0) return null;
  return (
    <div className="mt-4 border-t border-[var(--ae-border)] pt-3">
      <h3 className="ae-eyebrow ae-eyebrow-accent">Combat effects</h3>
      <p className="mb-2 mt-1 text-[11px] text-[var(--ae-fg-subtle)]">Not counted in the stats above.</p>
      <ul className="space-y-1.5">
        {effects.map((e) => (
          <EffectRow key={`${e.itemId}-${e.name}`} e={e} />
        ))}
      </ul>
    </div>
  );
}

/* ── Compare ──────────────────────────────────────────────────────────── */

function CompareStatPanel({
  a,
  b,
  dpsA,
  dpsB,
}: {
  a: BuildTotals;
  b: BuildTotals;
  dpsA: AutoAttackDps;
  dpsB: AutoAttackDps;
}) {
  const rowsA = statRows(a.stats, a.attackSpeed);
  const rowsB = statRows(b.stats, b.attackSpeed);
  type Cell = { label: string; group: StatGroup; aDisp?: string; bDisp?: string; aVal: number; bVal: number };
  const byKey = new Map<StatKey, Cell>();
  for (const r of rowsA) byKey.set(r.key, { label: r.label, group: r.group, aDisp: r.display, aVal: r.value, bVal: 0 });
  for (const r of rowsB) {
    const e = byKey.get(r.key) ?? { label: r.label, group: r.group, aVal: 0, bVal: 0 };
    e.bDisp = r.display;
    e.bVal = r.value;
    byKey.set(r.key, e);
  }
  const groups: StatGroup[] = ["offense", "defense", "utility"];
  const cells = [...byKey.entries()];
  const goldDelta = b.goldCost - a.goldCost;

  const better = (bv: number, av: number) =>
    bv > av ? "var(--ae-accent-secondary)" : bv < av ? "var(--ae-accent)" : "var(--ae-fg)";

  return (
    <div className="ae-panel p-4">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--ae-border)] pb-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">
        <span className="flex-1 text-[var(--ae-fg-muted)]">Stat</span>
        <span className="w-14 text-right text-[var(--ae-accent-secondary)]">A</span>
        <span className="w-14 text-right text-[var(--ae-accent)]">B</span>
      </div>

      <div className="flex items-center justify-between gap-2 border-b border-[var(--ae-border)] py-1.5 text-sm">
        <span className="flex-1 text-[var(--ae-fg-dim)]">Gold</span>
        <span className="ae-num w-14 text-right font-bold text-[var(--ae-fg)]">{formatGold(a.goldCost)}</span>
        <span className="ae-num w-14 text-right font-bold" style={{ color: better(a.goldCost, b.goldCost) }}>
          {formatGold(b.goldCost)}
        </span>
      </div>

      <div className="mt-3 border border-[var(--ae-border-strong)] p-2.5">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em]">
          <span className="flex-1 text-[var(--ae-accent)]">Auto DPS</span>
          <span className="w-14 text-right text-[var(--ae-accent-secondary)]">A</span>
          <span className="w-14 text-right text-[var(--ae-accent)]">B</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="flex-1 text-[11px] text-[var(--ae-fg-subtle)]" title={`Δ ${Math.round(goldDelta)} gold`}>
            vs target dummy
          </span>
          <span className="ae-num w-14 text-right text-lg font-bold text-[var(--ae-fg)]">
            {Math.round(dpsA.dps).toLocaleString("en-US")}
          </span>
          <span className="ae-num w-14 text-right text-lg font-bold" style={{ color: better(dpsB.dps, dpsA.dps) }}>
            {Math.round(dpsB.dps).toLocaleString("en-US")}
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-4">
        {groups.map((g) => {
          const gr = cells.filter(([, c]) => c.group === g);
          if (gr.length === 0) return null;
          return (
            <div key={g}>
              <h3 className="ae-eyebrow ae-eyebrow-accent mb-1.5">{GROUP_LABEL[g]}</h3>
              <div>
                {gr.map(([key, c]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-2 border-b border-[var(--ae-border)] py-1.5 text-sm last:border-0"
                  >
                    <span className="flex-1 text-[var(--ae-fg-dim)]">{c.label}</span>
                    <span className="ae-num w-14 text-right font-bold text-[var(--ae-fg)]">{c.aDisp ?? "—"}</span>
                    <span className="ae-num w-14 text-right font-bold" style={{ color: better(c.bVal, c.aVal) }}>
                      {c.bDisp ?? "—"}
                    </span>
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
      <div className="ae-in mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="ae-eyebrow mb-2">
            <span className="ae-eyebrow-accent">00/</span> Roster
          </div>
          <h1 className="text-[2.25rem] font-bold leading-[0.95] tracking-[-0.03em] text-[var(--ae-fg)]">
            Champion select<span className="ae-dot">.</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--ae-fg-dim)]">Pick a champion to start building.</p>
        </div>
        {canClose && (
          <button onClick={onClose} className="ae-btn">
            <span className="ae-arrow">←</span> Back to build
          </button>
        )}
      </div>

      <div className="ae-panel p-5">
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="SEARCH CHAMPIONS"
          className="ae-input mb-5 max-w-sm"
          autoFocus
          aria-label="Search champions"
        />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
          {filtered.map((c) => {
            const on = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="group flex flex-col items-center gap-1.5"
                title={`${c.name} — ${c.title}`}
              >
                <Portrait
                  name={c.name}
                  src={c.icon ? championIconUrl(c.icon) : undefined}
                  size={72}
                  className={
                    on
                      ? "!border-[var(--ae-accent)]"
                      : "transition group-hover:!border-[var(--ae-accent-secondary)]"
                  }
                />
                <span
                  className={`text-[11px] uppercase tracking-[0.08em] ${
                    on ? "text-[var(--ae-accent)]" : "text-[var(--ae-fg-muted)] group-hover:text-[var(--ae-fg)]"
                  }`}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-[var(--ae-fg-muted)]">No champions match.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Footer ───────────────────────────────────────────────────────────── */

function Footer({ patch, query }: { patch: string; query: string }) {
  const stats: [string, string][] = [
    ["ROSTER", `${champions.length} CHAMPIONS`],
    ["ITEMS", `${items.length} ITEMS`],
    ["PATCH", patch],
    ["DATA", patchMeta.verified ? "VERIFIED" : "SAMPLE"],
  ];
  return (
    <footer className="mt-16 border-t border-[var(--ae-border)] pt-10">
      <div className="grid grid-cols-2 gap-6 border-y border-[var(--ae-border)] py-8 sm:grid-cols-4">
        {stats.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--ae-fg-subtle)]">{k}</span>
            <span className="text-sm font-bold text-[var(--ae-fg)]">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 text-[clamp(3rem,11vw,7rem)] font-bold leading-[0.86] tracking-[-0.045em] text-[var(--ae-fg)]">
        WILD RIFT<span className="ae-dot">.</span>
      </div>
      <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-[var(--ae-fg-subtle)]">
        Wild Rift Builder / Patch {patch} / Raw logic. Refined form.
        {query ? <span className="ml-2 text-[var(--ae-border-strong)]">· ?{query.slice(0, 24)}…</span> : null}
      </p>
    </footer>
  );
}
