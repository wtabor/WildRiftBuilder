import type { Metadata } from "next";
import Link from "next/link";
import { champions, CURRENT_PATCH } from "@/lib/data";
import { breadcrumbLd, championPath, SITE_NAME } from "@/lib/seo";
import { JsonLd, PageShell } from "@/app/_components/PageShell";

export const metadata: Metadata = {
  title: `All ${champions.length} Wild Rift champions — stats for patch ${CURRENT_PATCH}`,
  description:
    `Every League of Legends: Wild Rift champion on patch ${CURRENT_PATCH}, with base stats, ` +
    `per-level growth and abilities. ${champions.length} champions, all sourced from official patch notes.`,
  alternates: { canonical: "/champions" },
};

/** Alphabetical — the order the dataset happens to be in is not meaningful. */
const sorted = [...champions].sort((a, b) => a.name.localeCompare(b.name));

const byRole = (() => {
  const map = new Map<string, number>();
  for (const c of champions) for (const r of c.roles) map.set(r, (map.get(r) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
})();

export default function ChampionsIndex() {
  return (
    <PageShell breadcrumb={[{ name: "Home", href: "/" }, { name: "Champions" }]}>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Champions", path: "/champions" },
        ])}
      />

      <h1 className="text-3xl font-bold sm:text-4xl">Wild Rift champions</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#b6bac2]">
        All {champions.length} champions in League of Legends: Wild Rift on patch{" "}
        <strong className="text-[#f5f6f8]">{CURRENT_PATCH}</strong>. Each page lists base stats,
        per-level growth, level-15 totals and full ability details. Wild Rift values differ from PC
        League — these are Wild Rift numbers, taken from Riot&apos;s own patch notes.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {byRole.map(([role, count]) => (
          <span
            key={role}
            className="rounded border border-white/10 px-2.5 py-1 font-mono text-[11px] tracking-wider text-[#8b8f9a]"
          >
            {role.toUpperCase()} · {count}
          </span>
        ))}
      </div>

      <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => (
          <li key={c.id}>
            <Link
              href={championPath(c.id)}
              className="flex items-baseline justify-between gap-3 rounded border border-white/10 px-3.5 py-3 transition-colors hover:border-[#ff6b1a]/60"
            >
              <span>
                <span className="font-semibold">{c.name}</span>
                {c.title && <span className="block text-xs text-[#8b8f9a]">{c.title}</span>}
              </span>
              <span className="shrink-0 font-mono text-[10px] tracking-wider text-[#8b8f9a]">
                {c.roles.join(" · ").toUpperCase()}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-[#8b8f9a]">
        Want to stack items and see live totals?{" "}
        <Link href="/" className="text-[#ff6b1a] underline underline-offset-4">
          Open the {SITE_NAME} calculator
        </Link>
        .
      </p>
    </PageShell>
  );
}
