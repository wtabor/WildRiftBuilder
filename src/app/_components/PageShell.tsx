import Link from "next/link";
import { CURRENT_PATCH, patchMeta } from "@/lib/data";
import { formatPatchDate } from "@/lib/format";

/**
 * Chrome for the statically-generated reference pages (`/champions`, `/items`
 * and their detail routes). Deliberately separate from `src/designs/` — those
 * are the interactive calculator's presentation; this is the crawlable content
 * surface, which wants plain semantic HTML, real links, and no client JS.
 */
export function PageShell({
  children,
  breadcrumb,
}: {
  children: React.ReactNode;
  breadcrumb: { name: string; href?: string }[];
}) {
  return (
    <div className="min-h-screen bg-[#0c0d10] text-[#f5f6f8]">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-mono text-sm font-bold tracking-widest">
            <span className="h-2 w-2 rounded-full bg-[#ff6b1a]" />
            WILD RIFT BUILDER
          </Link>
          <nav className="flex items-center gap-5 font-mono text-xs tracking-widest text-[#8b8f9a]">
            <Link href="/champions" className="hover:text-[#ff6b1a]">CHAMPIONS</Link>
            <Link href="/items" className="hover:text-[#ff6b1a]">ITEMS</Link>
            <Link href="/" className="hover:text-[#ff6b1a]">CALCULATOR</Link>
            <span className="text-[#ff6b1a]">PATCH {CURRENT_PATCH}</span>
          </nav>
        </div>
      </header>

      <nav aria-label="Breadcrumb" className="mx-auto max-w-5xl px-5 pt-6">
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-widest text-[#8b8f9a]">
          {breadcrumb.map((b, i) => (
            <li key={b.name} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden="true">/</span>}
              {b.href ? (
                <Link href={b.href} className="hover:text-[#ff6b1a]">{b.name.toUpperCase()}</Link>
              ) : (
                <span className="text-[#f5f6f8]">{b.name.toUpperCase()}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>

      <footer className="mt-12 border-t border-white/10">
        <div className="mx-auto max-w-5xl space-y-3 px-5 py-8 text-xs leading-relaxed text-[#8b8f9a]">
          <p>
            Data shown is for Wild Rift patch{" "}
            <strong className="text-[#f5f6f8]">{CURRENT_PATCH}</strong>
            {patchMeta.releaseDate && ` (released ${formatPatchDate(patchMeta.releaseDate)})`}, sourced
            from official Riot Wild Rift patch notes and cross-checked against community references.
            Wild Rift values differ from PC League of Legends — nothing here is copied from PC data.
          </p>
          {/* Riot's Legal Jibber Jabber policy requires fan projects using their
              IP to carry this disclaimer. Required for a public deployment. */}
          <p>
            Wild Rift Builder is an unofficial fan project. It is not endorsed by Riot Games and does
            not reflect the views or opinions of Riot Games or anyone officially involved in producing
            or managing Riot Games properties. Riot Games and all associated properties are trademarks
            or registered trademarks of Riot Games, Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}

/** Serializes a JSON-LD payload into the document. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Payload is built from our own dataset and constants, never remote input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
