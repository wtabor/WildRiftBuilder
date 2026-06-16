"use client";

import { STAT_KEYS, STAT_META, type StatBlock, type StatKey } from "@/lib/schema";
import { formatStat } from "@/lib/format";

const GROUPS: { id: "offense" | "defense" | "utility"; label: string; color: string }[] = [
  { id: "offense", label: "Offense", color: "text-rift-ad" },
  { id: "defense", label: "Defense", color: "text-rift-tank" },
  { id: "utility", label: "Utility", color: "text-rift-blue" },
];

export function StatPanel({
  stats,
  attackSpeed,
}: {
  stats: StatBlock;
  attackSpeed: number;
}) {
  return (
    <div className="rounded-lg border border-rift-border bg-rift-panel p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-rift-gold">
        Total Stats
      </h2>

      <div className="space-y-4">
        {GROUPS.map((group) => {
          const keys = STAT_KEYS.filter(
            (k) => STAT_META[k].group === group.id && hasValue(stats, k, attackSpeed),
          );
          if (keys.length === 0) return null;
          return (
            <div key={group.id}>
              <h3 className={`mb-1.5 text-xs font-semibold uppercase ${group.color}`}>
                {group.label}
              </h3>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {keys.map((k) => (
                  <Row key={k} statKey={k} stats={stats} attackSpeed={attackSpeed} />
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hasValue(stats: StatBlock, key: StatKey, attackSpeed: number): boolean {
  if (key === "attackSpeed") return attackSpeed > 0;
  return Boolean(stats[key]);
}

function Row({
  statKey,
  stats,
  attackSpeed,
}: {
  statKey: StatKey;
  stats: StatBlock;
  attackSpeed: number;
}) {
  const meta = STAT_META[statKey];
  // Attack speed is special: show the final attacks-per-second value, not the ratio.
  const display =
    statKey === "attackSpeed"
      ? `${attackSpeed.toFixed(2)}`
      : formatStat(statKey, stats[statKey] ?? 0);
  return (
    <div className="flex items-baseline justify-between border-b border-rift-border/40 py-0.5">
      <dt className="text-sm text-rift-gold2/80">{meta.label}</dt>
      <dd className="font-mono text-sm font-semibold text-rift-gold2">{display}</dd>
    </div>
  );
}
