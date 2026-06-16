"use client";

import { useCallback, useEffect, useState } from "react";
import { CURRENT_PATCH } from "@/lib/data";

export interface BuildState {
  championId: string | null;
  level: number;
  itemIds: string[]; // includes boots; engine treats all as stat sources
}

const DEFAULT: BuildState = { championId: null, level: 1, itemIds: [] };
const MAX_ITEMS = 6;

/** Encode build state into a compact query string for shareable URLs. */
export function encodeBuild(b: BuildState): string {
  const params = new URLSearchParams();
  if (b.championId) params.set("c", b.championId);
  params.set("lvl", String(b.level));
  if (b.itemIds.length) params.set("i", b.itemIds.join(","));
  return params.toString();
}

export function decodeBuild(search: string): BuildState {
  const params = new URLSearchParams(search);
  const champ = params.get("c");
  const lvl = Number(params.get("lvl"));
  const items = params.get("i");
  return {
    championId: champ || null,
    level: Number.isFinite(lvl) && lvl >= 1 ? Math.min(lvl, 15) : 1,
    itemIds: items ? items.split(",").filter(Boolean).slice(0, MAX_ITEMS) : [],
  };
}

/**
 * Single source of truth for the current build, mirrored to the URL so any
 * build is shareable by copying the address. No backend required (Phase 1).
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

  const addItem = useCallback((itemId: string) => {
    setBuild((b) =>
      b.itemIds.length >= MAX_ITEMS ? b : { ...b, itemIds: [...b.itemIds, itemId] },
    );
  }, []);

  const removeItemAt = useCallback((index: number) => {
    setBuild((b) => ({ ...b, itemIds: b.itemIds.filter((_, i) => i !== index) }));
  }, []);

  const clearItems = useCallback(() => {
    setBuild((b) => ({ ...b, itemIds: [] }));
  }, []);

  return {
    build,
    patch: CURRENT_PATCH,
    setChampion,
    setLevel,
    addItem,
    removeItemAt,
    clearItems,
    maxItems: MAX_ITEMS,
  };
}
