"use client";

import { useState } from "react";
import { champions } from "@/lib/data";
import type { Champion } from "@/lib/schema";

export function ChampionPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = champions.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="rounded-lg border border-rift-border bg-rift-panel p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-rift-gold">
        Champion
      </h2>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search champions…"
        className="mb-3 w-full rounded border border-rift-border bg-rift-bg px-3 py-2 text-sm outline-none focus:border-rift-blue"
      />
      <div className="flex flex-wrap gap-2">
        {filtered.map((champ) => (
          <ChampionChip
            key={champ.id}
            champ={champ}
            selected={champ.id === selectedId}
            onSelect={onSelect}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-rift-gold2/50">No champions match.</p>
        )}
      </div>
    </div>
  );
}

function ChampionChip({
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
      className={`rounded-md border px-3 py-2 text-left transition ${
        selected
          ? "border-rift-gold bg-rift-gold/10 text-rift-gold"
          : "border-rift-border bg-rift-bg hover:border-rift-blue"
      }`}
    >
      <div className="text-sm font-semibold">{champ.name}</div>
      <div className="text-xs text-rift-gold2/50">{champ.roles.join(" · ")}</div>
    </button>
  );
}
