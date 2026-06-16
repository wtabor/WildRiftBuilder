"use client";

import { useMemo } from "react";
import { getChampion, getItems, patchMeta } from "@/lib/data";
import { computeBuild } from "@/lib/stats/engine";
import { useBuildState } from "@/state/buildState";
import { ChampionPicker } from "@/components/ChampionPicker";
import { ItemShop } from "@/components/ItemShop";
import { BuildBar } from "@/components/BuildBar";
import { StatPanel } from "@/components/StatPanel";

export default function BuilderPage() {
  const { build, patch, setChampion, setLevel, addItem, removeItemAt, clearItems, maxItems } =
    useBuildState();

  const champion = build.championId ? getChampion(build.championId) : undefined;
  const buildItems = useMemo(() => getItems(build.itemIds), [build.itemIds]);

  const totals = useMemo(
    () => (champion ? computeBuild(champion, build.level, buildItems) : null),
    [champion, build.level, buildItems],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-rift-gold">Wild Rift Builder</h1>
          <p className="text-sm text-rift-gold2/60">
            Stat &amp; build calculator for League of Legends: Wild Rift
          </p>
        </div>
        <div className="flex items-center gap-2 text-right">
          <span
            className={`rounded px-2 py-1 text-xs font-semibold ${
              patchMeta.verified
                ? "bg-rift-blue/15 text-rift-blue"
                : "bg-rift-tank/15 text-rift-tank"
            }`}
            title={patchMeta.verified ? "Data hand-verified" : "Sample data — not yet verified"}
          >
            Patch {patch} {patchMeta.verified ? "✓" : "· sample data"}
          </span>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <ChampionPicker selectedId={build.championId} onSelect={setChampion} />

          {champion && (
            <>
              <LevelControl level={build.level} onChange={setLevel} />
              <ItemShop onAdd={addItem} disabled={build.itemIds.length >= maxItems} />
            </>
          )}
        </div>

        <aside className="space-y-4">
          {champion && totals ? (
            <>
              <BuildBar
                items={buildItems}
                maxItems={maxItems}
                goldCost={totals.goldCost}
                onRemove={removeItemAt}
                onClear={clearItems}
              />
              <StatPanel
                stats={totals.stats}
                attackSpeed={totals.attackSpeed}
                provenance={champion.provenance}
              />
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-rift-border bg-rift-panel p-6 text-center text-sm text-rift-gold2/60">
              Select a champion to start building.
            </div>
          )}
        </aside>
      </div>

      <footer className="mt-8 text-center text-xs text-rift-gold2/40">
        Data sources: {patchMeta.sources.join(" · ")}
      </footer>
    </main>
  );
}

function LevelControl({
  level,
  onChange,
}: {
  level: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-lg border border-rift-border bg-rift-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-rift-gold">
          Level
        </h2>
        <span className="font-mono text-lg font-bold text-rift-gold2">{level}</span>
      </div>
      <input
        type="range"
        min={1}
        max={15}
        value={level}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-rift-gold"
      />
      <div className="mt-1 flex justify-between text-xs text-rift-gold2/40">
        <span>1</span>
        <span>15</span>
      </div>
    </div>
  );
}
