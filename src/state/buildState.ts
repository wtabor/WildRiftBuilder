"use client";

import { useCallback, useEffect, useState } from "react";
import { CURRENT_PATCH } from "@/lib/data";

export type BuildKey = "A" | "B";

export interface BuildState {
  championId: string | null;
  level: number;
  itemIds: string[]; // build A — includes boots; engine treats all as stat sources
  itemIdsB: string[]; // build B — the optional comparison build
  compare: boolean; // whether the comparison build is shown
  active: BuildKey; // which build the shop adds items to
}

const DEFAULT: BuildState = {
  championId: null,
  level: 1,
  itemIds: [],
  itemIdsB: [],
  compare: false,
  active: "A",
};
const MAX_ITEMS = 6;

/** Encode build state into a compact query string for shareable URLs. */
export function encodeBuild(b: BuildState): string {
  const params = new URLSearchParams();
  if (b.championId) params.set("c", b.championId);
  params.set("lvl", String(b.level));
  if (b.itemIds.length) params.set("i", b.itemIds.join(","));
  if (b.compare) params.set("cmp", "1");
  if (b.itemIdsB.length) params.set("i2", b.itemIdsB.join(","));
  if (b.active === "B") params.set("a", "B");
  return params.toString();
}

export function decodeBuild(search: string): BuildState {
  const params = new URLSearchParams(search);
  const champ = params.get("c");
  const lvl = Number(params.get("lvl"));
  const items = params.get("i");
  const itemsB = params.get("i2");
  return {
    championId: champ || null,
    level: Number.isFinite(lvl) && lvl >= 1 ? Math.min(lvl, 15) : 1,
    itemIds: items ? items.split(",").filter(Boolean).slice(0, MAX_ITEMS) : [],
    itemIdsB: itemsB ? itemsB.split(",").filter(Boolean).slice(0, MAX_ITEMS) : [],
    compare: params.get("cmp") === "1" || Boolean(itemsB),
    active: params.get("a") === "B" ? "B" : "A",
  };
}

/**
 * Single source of truth for the current build(s), mirrored to the URL so any
 * build — or a two-build comparison — is shareable by copying the address.
 * No backend required (Phase 1).
 */
export function useBuildState() {
  const [build, setBuild] = useState<BuildState>(DEFAULT);

  // Hydrate from URL on first mount (client-only to avoid SSR mismatch).
  useEffect(() => {
    setBuild(decodeBuild(window.location.search));
  }, []);

  // Mirror to the URL whenever the build changes.
  useEffect(() => {
    const qs = encodeBuild(build);
    const url = qs ? `?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [build]);

  const setChampion = useCallback((championId: string) => {
    setBuild((b) => ({ ...b, championId }));
  }, []);

  const setLevel = useCallback((level: number) => {
    setBuild((b) => ({ ...b, level: Math.max(1, Math.min(15, level)) }));
  }, []);

  /** Add to whichever build is active. Max 6, and never two of the same item. */
  const addItem = useCallback((itemId: string) => {
    setBuild((b) => {
      const field = b.active === "B" ? "itemIdsB" : "itemIds";
      const list = b[field];
      if (list.length >= MAX_ITEMS || list.includes(itemId)) return b;
      return { ...b, [field]: [...list, itemId] };
    });
  }, []);

  const removeItemAt = useCallback((key: BuildKey, index: number) => {
    setBuild((b) => {
      const field = key === "B" ? "itemIdsB" : "itemIds";
      return { ...b, [field]: b[field].filter((_, i) => i !== index) };
    });
  }, []);

  const clearItems = useCallback((key: BuildKey) => {
    setBuild((b) => ({ ...b, [key === "B" ? "itemIdsB" : "itemIds"]: [] }));
  }, []);

  const setActive = useCallback((active: BuildKey) => {
    setBuild((b) => ({ ...b, active }));
  }, []);

  const toggleCompare = useCallback(() => {
    setBuild((b) =>
      b.compare
        ? { ...b, compare: false, active: "A" } // turning off returns focus to A
        : { ...b, compare: true },
    );
  }, []);

  return {
    build,
    patch: CURRENT_PATCH,
    setChampion,
    setLevel,
    addItem,
    removeItemAt,
    clearItems,
    setActive,
    toggleCompare,
    maxItems: MAX_ITEMS,
  };
}
