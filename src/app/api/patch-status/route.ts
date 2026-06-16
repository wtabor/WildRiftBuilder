import { NextResponse } from "next/server";
import { CURRENT_PATCH } from "@/lib/data";
import { fetchPatchNotesFeed } from "@/lib/patchNotes/fetch";
import { isNewerPatch } from "@/lib/patchNotes/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lightweight feed/staleness endpoint for the UI. No LLM, no PR — just "what's
 * the latest live patch, and are we behind?". Cached briefly at the edge.
 */
export async function GET(): Promise<Response> {
  const feed = await fetchPatchNotesFeed();
  const latest = feed.entries[0] ?? null;
  const stale = latest ? isNewerPatch(latest.version, CURRENT_PATCH) : false;

  return NextResponse.json(
    {
      current: CURRENT_PATCH,
      latest: latest?.version ?? null,
      latestUrl: latest?.url ?? null,
      stale,
      source: feed.source,
      entries: feed.entries.slice(0, 10),
    },
    { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
