"use client";

import { useCallback, useEffect, useState } from "react";
import { CURRENT_PATCH } from "@/lib/data";

export type BuildKey = "A" | "B";

/** The enemy the damage engine computes against. Shared by both builds. */
export interface TargetStats {
  armor: number;
  magicResist: number;
  maxHealth: number;
}

/** A mid-game reference enemy, used until the user dials in their own. */
export const DEFAULT_TARGET: TargetStats = { armor: 100, magicResist: 50, maxHealth: 2000 };

export interface BuildState {
  championId: string | null;
  level: number;
  itemIds: string[]; // build A — the 6 regular item slots
  bootsId: string | null; // build A — the dedicated boots slot (1 of 7 boots)
  enchantId: string | null; // build A — enchant riding on the boots (needs boots)
  itemIdsB: string[]; // build B — the optional comparison build
  bootsIdB: string | null; // build B — its boots slot
  enchantIdB: string | null; // build B — its boots enchant
  compare: boolean; // whether the comparison build is shown
  active: BuildKey; // which build the shop adds items to
  target: TargetStats; // the enemy the damage engine computes against
}

const DEFAULT: BuildState = {
  championId: null,
  level: 1,
  itemIds: [],
  bootsId: null,
  enchantId: null,
  itemIdsB: [],
  bootsIdB: null,
  enchantIdB: null,
  compare: false,
  active: "A",
  target: DEFAULT_TARGET,
};
const MAX_ITEMS = 6;

/** Encode build state into a compact query string for shareable URLs. */
export function encodeBuild(b: BuildState): string {
  const params = new URLSearchParams();
  if (b.championId) params.set("c", b.championId);
  params.set("lvl", String(b.level));
  if (b.itemIds.length) params.set("i", b.itemIds.join(","));
  if (b.bootsId) params.set("b", b.bootsId);
  if (b.enchantId) params.set("e", b.enchantId);
  if (b.compare) params.set("cmp", "1");
  if (b.itemIdsB.length) params.set("i2", b.itemIdsB.join(","));
  if (b.bootsIdB) params.set("b2", b.bootsIdB);
  if (b.enchantIdB) params.set("e2", b.enchantIdB);
  if (b.active === "B") params.set("a", "B");
  const { armor, magicResist, maxHealth } = b.target;
  if (armor !== DEFAULT_TARGET.armor || magicResist !== DEFAULT_TARGET.magicResist || maxHealth !== DEFAULT_TARGET.maxHealth) {
    params.set("t", `${armor},${magicResist},${maxHealth}`);
  }
  return params.toString();
}

export function decodeBuild(search: string): BuildState {
  const params = new URLSearchParams(search);
  const champ = params.get("c");
  const lvl = Number(params.get("lvl"));
  const items = params.get("i");
  const itemsB = params.get("i2");
  const boots = params.get("b");
  const bootsB = params.get("b2");
  // An enchant only exists while it has boots to ride on; drop a stray stamp.
  const enchant = boots ? params.get("e") : null;
  const enchantB = bootsB ? params.get("e2") : null;
  const target = parseTarget(params.get("t"));
  return {
    championId: champ || null,
    level: Number.isFinite(lvl) && lvl >= 1 ? Math.min(lvl, 15) : 1,
    itemIds: items ? items.split(",").filter(Boolean).slice(0, MAX_ITEMS) : [],
    bootsId: boots || null,
    enchantId: enchant || null,
    itemIdsB: itemsB ? itemsB.split(",").filter(Boolean).slice(0, MAX_ITEMS) : [],
    bootsIdB: bootsB || null,
    enchantIdB: enchantB || null,
    compare: params.get("cmp") === "1" || Boolean(itemsB) || Boolean(bootsB),
    active: params.get("a") === "B" ? "B" : "A",
    target,
  };
}

/** Parse a "armor,mr,hp" target string, falling back to the default per field. */
function parseTarget(raw: string | null): TargetStats {
  if (!raw) return DEFAULT_TARGET;
  const [a, m, h] = raw.split(",").map(Number);
  return {
    armor: Number.isFinite(a) && a >= 0 ? a : DEFAULT_TARGET.armor,
    magicResist: Number.isFinite(m) && m >= 0 ? m : DEFAULT_TARGET.magicResist,
    maxHealth: Number.isFinite(h) && h > 0 ? h : DEFAULT_TARGET.maxHealth,
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

  /**
   * Load a curated preset (a "standing build") into whichever build is
   * currently active — A normally, or B while comparing and B is focused.
   * Mirrors how the shop/item actions already target `b.active`, so loading a
   * preset while comparing fills the focused build instead of blowing away
   * the comparison. Champion and level are shared across A/B by design.
   */
  const loadBuild = useCallback(
    (preset: {
      championId: string;
      items: string[];
      boots?: string;
      enchant?: string;
      level?: number;
    }) => {
      setBuild((b) => {
        const isB = b.active === "B";
        const itemsField = isB ? "itemIdsB" : "itemIds";
        const bootsField = isB ? "bootsIdB" : "bootsId";
        const enchantField = isB ? "enchantIdB" : "enchantId";
        return {
          ...b,
          championId: preset.championId,
          level: preset.level ? Math.max(1, Math.min(15, preset.level)) : b.level,
          [itemsField]: preset.items.slice(0, MAX_ITEMS),
          [bootsField]: preset.boots ?? null,
          [enchantField]: preset.boots ? preset.enchant ?? null : null,
        };
      });
    },
    [],
  );

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

  /**
   * Set (or, when re-selecting the same boots, clear) the active build's
   * dedicated boots slot. Boots live outside the 6 item slots. Removing the
   * boots also drops any enchant riding on them.
   */
  const setBoots = useCallback((bootsId: string) => {
    setBuild((b) => {
      const isB = b.active === "B";
      const bootsField = isB ? "bootsIdB" : "bootsId";
      const enchantField = isB ? "enchantIdB" : "enchantId";
      const cleared = b[bootsField] === bootsId;
      return {
        ...b,
        [bootsField]: cleared ? null : bootsId,
        // Re-selecting (clearing) the boots also clears its enchant.
        ...(cleared ? { [enchantField]: null } : {}),
      };
    });
  }, []);

  const removeBoots = useCallback((key: BuildKey) => {
    setBuild((b) =>
      key === "B"
        ? { ...b, bootsIdB: null, enchantIdB: null }
        : { ...b, bootsId: null, enchantId: null },
    );
  }, []);

  /**
   * Set (or toggle off) the enchant riding on the active build's boots. A
   * no-op unless boots are equipped — enchants upgrade boots, nothing else.
   */
  const setEnchant = useCallback((enchantId: string) => {
    setBuild((b) => {
      const isB = b.active === "B";
      const hasBoots = (isB ? b.bootsIdB : b.bootsId) !== null;
      if (!hasBoots) return b;
      const field = isB ? "enchantIdB" : "enchantId";
      return { ...b, [field]: b[field] === enchantId ? null : enchantId };
    });
  }, []);

  const removeEnchant = useCallback((key: BuildKey) => {
    setBuild((b) => ({ ...b, [key === "B" ? "enchantIdB" : "enchantId"]: null }));
  }, []);

  const clearItems = useCallback((key: BuildKey) => {
    setBuild((b) =>
      key === "B"
        ? { ...b, itemIdsB: [], bootsIdB: null, enchantIdB: null }
        : { ...b, itemIds: [], bootsId: null, enchantId: null },
    );
  }, []);

  const setActive = useCallback((active: BuildKey) => {
    setBuild((b) => ({ ...b, active }));
  }, []);

  /** Update one field of the shared damage target (clamped to sane bounds). */
  const setTarget = useCallback((patch: Partial<TargetStats>) => {
    setBuild((b) => ({
      ...b,
      target: {
        armor: clampNum(patch.armor ?? b.target.armor, 0, 500),
        magicResist: clampNum(patch.magicResist ?? b.target.magicResist, 0, 500),
        maxHealth: clampNum(patch.maxHealth ?? b.target.maxHealth, 1, 20000),
      },
    }));
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
    loadBuild,
    addItem,
    removeItemAt,
    setBoots,
    removeBoots,
    setEnchant,
    removeEnchant,
    clearItems,
    setActive,
    setTarget,
    toggleCompare,
    maxItems: MAX_ITEMS,
  };
}

function clampNum(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}
