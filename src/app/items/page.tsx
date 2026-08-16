import type { Metadata } from "next";
import Link from "next/link";
import { items, CURRENT_PATCH } from "@/lib/data";
import { formatGold } from "@/lib/format";
import { breadcrumbLd, itemPath } from "@/lib/seo";
import { JsonLd, PageShell } from "@/app/_components/PageShell";

export const metadata: Metadata = {
  title: `All ${items.length} Wild Rift items — stats & costs for patch ${CURRENT_PATCH}`,
  description:
    `Every League of Legends: Wild Rift item on patch ${CURRENT_PATCH}, with gold cost, full stat ` +
    `lines and passive effects. ${items.length} items, sourced from official Riot patch notes.`,
  alternates: { canonical: "/items" },
};

const GROUPS: { label: string; match: (slot: string) => boolean }[] = [
  { label: "Items", match: (s) => s === "item" },
  { label: "Boots", match: (s) => s === "boots" },
  { label: "Enchantments (pre-7.2, legacy)", match: (s) => s === "enchant" },
];

export default function ItemsIndex() {
  return (
    <PageShell breadcrumb={[{ name: "Home", href: "/" }, { name: "Items" }]}>
      <JsonLd
        data={breadcrumbLd([
          { name: "Home", path: "/" },
          { name: "Items", path: "/items" },
        ])}
      />

      <h1 className="text-3xl font-bold sm:text-4xl">Wild Rift items</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#b6bac2]">
        All {items.length} items in League of Legends: Wild Rift on patch{" "}
        <strong className="text-[#f5f6f8]">{CURRENT_PATCH}</strong>, with gold costs, full stat lines
        and passive effects. Wild Rift item stats and prices differ from PC League — these are Wild
        Rift values.
      </p>

      {GROUPS.map(({ label, match }) => {
        const group = items.filter((i) => match(i.slot)).sort((a, b) => a.name.localeCompare(b.name));
        if (group.length === 0) return null;
        return (
          <section key={label} className="mt-8">
            <h2 className="text-xl font-bold">
              {label}{" "}
              <span className="font-mono text-sm font-normal text-[#8b8f9a]">({group.length})</span>
            </h2>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((i) => (
                <li key={i.id}>
                  <Link
                    href={itemPath(i.id)}
                    className="flex items-baseline justify-between gap-3 rounded border border-white/10 px-3.5 py-3 transition-colors hover:border-[#ff6b1a]/60"
                  >
                    <span className="font-semibold">{i.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-[#ff6b1a]">
                      {formatGold(i.cost)} G
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className="mt-10 text-sm text-[#8b8f9a]">
        <Link href="/" className="text-[#ff6b1a] underline underline-offset-4">
          Open the calculator
        </Link>{" "}
        to stack items on a champion, or{" "}
        <Link href="/champions" className="text-[#ff6b1a] underline underline-offset-4">
          browse all champions
        </Link>
        .
      </p>
    </PageShell>
  );
}
