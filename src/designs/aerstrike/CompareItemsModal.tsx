"use client";

import { useEffect, useMemo, useState } from "react";
import { champions, items } from "@/lib/data";
import { itemIconUrl } from "@/lib/visual";

interface CompareResponse {
  summary: string;
  grounding: {
    itemA: { item: { name: string; cost: string; stats: string[] }; withChampion: { finalAttackSpeed: string; autoAttackDps: number; goldCost: string } };
    itemB: { item: { name: string; cost: string; stats: string[] }; withChampion: { finalAttackSpeed: string; autoAttackDps: number; goldCost: string } };
  };
}

export function CompareItemsModal({
  open,
  onClose,
  defaultChampionId,
}: {
  open: boolean;
  onClose: () => void;
  defaultChampionId: string | null;
}) {
  const [championId, setChampionId] = useState(defaultChampionId ?? champions[0]?.id ?? "");
  const [itemAId, setItemAId] = useState("");
  const [itemBId, setItemBId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  // Re-sync to the champion currently being built whenever the modal opens.
  useEffect(() => {
    if (open) setChampionId(defaultChampionId ?? champions[0]?.id ?? "");
  }, [open, defaultChampionId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sortedItems = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), []);

  async function runCompare() {
    if (!championId || !itemAId || !itemBId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compare-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ championId, itemAId, itemBId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setResult(data);
    } catch {
      setError("Couldn't reach the AI summary service.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const canCompare = Boolean(championId && itemAId && itemBId && itemAId !== itemBId);

  return (
    <div className="ae-modal-backdrop" role="dialog" aria-modal="true" aria-label="Compare items" onClick={onClose}>
      <div className="ae-modal ae-panel ae-panel--corner ae-panel--accent" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="ae-eyebrow mb-1">
              <span className="ae-eyebrow-accent">AI/</span> Compare items
            </div>
            <h2 className="text-xl font-bold text-[var(--ae-fg)]">
              Which item wins<span className="ae-dot">.</span>
            </h2>
            <p className="mt-1 text-xs text-[var(--ae-fg-dim)]">
              Pick a champion and two items — the verdict is grounded in this app&rsquo;s own computed stats, not
              guessed by the model.
            </p>
          </div>
          <button onClick={onClose} className="ae-btn shrink-0" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ae-fg-subtle)]">Champion</span>
            <select
              value={championId}
              onChange={(e) => {
                setChampionId(e.target.value);
                setResult(null);
              }}
              className="ae-input"
            >
              {champions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ae-fg-subtle)]">Item A</span>
            <select
              value={itemAId}
              onChange={(e) => {
                setItemAId(e.target.value);
                setResult(null);
              }}
              className="ae-input"
            >
              <option value="">Select an item…</option>
              {sortedItems.map((it) => (
                <option key={it.id} value={it.id} disabled={it.id === itemBId}>
                  {it.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--ae-fg-subtle)]">Item B</span>
            <select
              value={itemBId}
              onChange={(e) => {
                setItemBId(e.target.value);
                setResult(null);
              }}
              className="ae-input"
            >
              <option value="">Select an item…</option>
              {sortedItems.map((it) => (
                <option key={it.id} value={it.id} disabled={it.id === itemAId}>
                  {it.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          onClick={runCompare}
          disabled={!canCompare || loading}
          className="ae-btn ae-btn--primary mt-4 w-full justify-center"
        >
          {loading ? "Analyzing…" : "Get AI verdict"}
          {!loading && <span className="ae-arrow">→</span>}
        </button>

        {error && (
          <p className="mt-4 border border-[color-mix(in_srgb,var(--ae-accent)_40%,transparent)] bg-[color-mix(in_srgb,var(--ae-accent)_8%,transparent)] px-3 py-2 text-xs text-[var(--ae-accent)]">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-5 border-t border-[var(--ae-border)] pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ItemSnapshot grounding={result.grounding.itemA} />
              <ItemSnapshot grounding={result.grounding.itemB} />
            </div>
            <div className="mt-4 border border-[var(--ae-border-strong)] p-3">
              <div className="ae-eyebrow ae-eyebrow-accent mb-2">AI verdict — grounded in the stats above</div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--ae-fg-dim)]">{result.summary}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemSnapshot({ grounding }: { grounding: CompareResponse["grounding"]["itemA"] }) {
  const it = items.find((i) => i.name === grounding.item.name);
  return (
    <div className="ae-panel p-3">
      <div className="flex items-center gap-2.5">
        {it?.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={itemIconUrl(it.icon)} alt={grounding.item.name} width={32} height={32} loading="lazy" />
        )}
        <div>
          <div className="text-sm font-bold text-[var(--ae-fg)]">{grounding.item.name}</div>
          <div className="ae-num text-xs text-[var(--ae-accent-tertiary)]">{grounding.item.cost} G</div>
        </div>
      </div>
      <ul className="mt-2 space-y-0.5">
        {grounding.item.stats.map((s) => (
          <li key={s} className="text-[11.5px] text-[var(--ae-fg-dim)]">
            {s}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-[var(--ae-border)] pt-2 text-[11px] text-[var(--ae-fg-muted)]">
        <span>Auto DPS vs dummy</span>
        <span className="ae-num font-bold text-[var(--ae-fg)]">{grounding.withChampion.autoAttackDps}</span>
      </div>
    </div>
  );
}
