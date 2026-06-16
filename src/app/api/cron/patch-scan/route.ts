import { NextResponse } from "next/server";
import { CURRENT_PATCH } from "@/lib/data";
import { fetchPatchNotesFeed, fetchArticleText } from "@/lib/patchNotes/fetch";
import { isNewerPatch } from "@/lib/patchNotes/version";
import { applyChangeset } from "@/lib/patchNotes/changeset";
import { extractChangeset } from "@/lib/patchNotes/extract";
import { openUpdatePr } from "@/lib/patchNotes/github";
import championsOverridesRaw from "@data/overrides/champions.json";
import itemsOverridesRaw from "@data/overrides/items.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Scheduled patch scanner (wired to a Vercel Cron in vercel.json).
 *
 * 1. Fetch the patch-notes feed (official Riot, mirror fallback).
 * 2. If the latest patch is newer than what we ship, fetch its notes.
 * 3. Ask Claude to extract a numeric changeset against our overrides.
 * 4. Apply it and open a REVIEW PR — never an auto-merge.
 *
 * Required env: CRON_SECRET (auth), ANTHROPIC_API_KEY (extract),
 * GITHUB_TOKEN + PATCH_BOT_REPO (PR). `?dry=1` runs steps 1–3 and skips the PR.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dryRun = new URL(request.url).searchParams.get("dry") === "1";

  const feed = await fetchPatchNotesFeed();
  const latest = feed.entries[0];
  if (!latest) {
    return NextResponse.json({ status: "no-feed", source: feed.source });
  }

  if (!isNewerPatch(latest.version, CURRENT_PATCH)) {
    return NextResponse.json({
      status: "up-to-date",
      current: CURRENT_PATCH,
      latest: latest.version,
      source: feed.source,
    });
  }

  const article = await fetchArticleText(latest.url);
  if (!article) {
    return NextResponse.json(
      { status: "article-unavailable", latest: latest.version, url: latest.url },
      { status: 502 },
    );
  }

  const championsOverrides = championsOverridesRaw as Record<string, unknown>;
  const itemsOverrides = itemsOverridesRaw as unknown[];

  const changeset = await extractChangeset(article, {
    patch: latest.version,
    champions: championsOverrides,
    items: itemsOverrides,
  });

  const result = applyChangeset(championsOverrides, itemsOverrides, changeset);

  if (dryRun) {
    return NextResponse.json({
      status: "dry-run",
      latest: latest.version,
      applied: result.applied,
      skipped: result.skipped,
      summary: changeset.summary,
    });
  }

  const body = [
    `Automated patch-data update for **${latest.version}** (source: ${feed.source}).`,
    "",
    `> ${changeset.summary}`,
    "",
    `Patch notes: ${latest.url}`,
    "",
    `### Applied (${result.applied.length})`,
    ...result.applied.map((a) => `- ${a}`),
    result.skipped.length ? `\n### Skipped (needs human review)` : "",
    ...result.skipped.map((s) => `- ${s}`),
    "",
    "⚠️ LLM-extracted from patch-note prose — **verify every number against the in-game client**, then run `npm run build-data` and set the affected overrides to `verified: true` before merging.",
  ].join("\n");

  const pr = await openUpdatePr({
    branch: `auto/patch-${latest.version.replace(/\./g, "-")}`,
    title: `Patch ${latest.version}: proposed data updates`,
    body,
    files: [
      {
        path: "data/overrides/champions.json",
        content: JSON.stringify(result.champions, null, 2) + "\n",
      },
      {
        path: "data/overrides/items.json",
        content: JSON.stringify(result.items, null, 2) + "\n",
      },
    ],
  });

  return NextResponse.json({
    status: pr.status === "exists" ? "already-open" : "pr-opened",
    latest: latest.version,
    applied: result.applied.length,
    skipped: result.skipped.length,
    pr: pr.url,
  });
}
