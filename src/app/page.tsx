import Link from "next/link";
import { DESIGNS } from "@/designs/registry";
import { patchMeta } from "@/lib/data";
import { champions, items } from "@/lib/data";
import { ChevronRightIcon } from "@/lib/icons";

export default function GalleryPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070b16] font-sans text-aurora-ink">
      {/* Ambient backdrop */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[55vh] w-[55vh] animate-aurora-drift rounded-full bg-aurora-teal/15 blur-[130px]" />
        <div className="absolute -right-1/4 top-0 h-[55vh] w-[55vh] animate-aurora-drift rounded-full bg-aurora-violet/15 blur-[130px] [animation-delay:-8s]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
            backgroundSize: "30px 30px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 py-12 sm:py-20">
        {/* Hero */}
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-aurora-mute">
            <span className="h-1.5 w-1.5 rounded-full bg-aurora-teal" />
            Design exploration · {champions.length} champions · {items.length} items · patch{" "}
            {patchMeta.patch}
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Wild Rift Builder —{" "}
            <span className="bg-gradient-to-r from-aurora-teal via-aurora-violet to-aurora-pink bg-clip-text text-transparent">
              three design directions
            </span>
          </h1>
          <p className="mt-4 text-lg text-aurora-mute">
            One accurate stat &amp; build engine, three distinct interfaces. Each is a fully
            functional builder — your champion, level, and items are shared across all three, so you
            can flip between them with the same build and judge the feel. Pick one to open.
          </p>
        </div>

        {/* Design cards */}
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {DESIGNS.map((d, i) => (
            <Link
              key={d.id}
              href={`/designs/${d.id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-1.5 transition hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.05]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <DesignPreview id={d.id} accent={d.accent} accent2={d.accent2} />
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${d.accent}, ${d.accent2})` }}
                  />
                  <h2 className="text-xl font-semibold">{d.name}</h2>
                </div>
                <p className="mt-0.5 text-xs uppercase tracking-wider text-aurora-mute">
                  {d.tagline}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-aurora-ink/80">{d.blurb}</p>
                <ul className="mt-4 space-y-1.5">
                  {d.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-2 text-sm text-aurora-mute">
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{ background: d.accent }}
                      />
                      {h}
                    </li>
                  ))}
                </ul>
                <span
                  className="mt-5 inline-flex items-center gap-1 text-sm font-medium transition group-hover:gap-2"
                  style={{ color: d.accent }}
                >
                  Open builder <ChevronRightIcon width={16} height={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Footer note */}
        <footer className="mt-16 border-t border-white/10 pt-6 text-sm text-aurora-mute">
          <p>
            All three designs read from the same pure stat engine and patch-versioned data — being{" "}
            <em>correct</em> where other tools are wrong is the point. See{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs">DESIGN_WORKFLOW.md</code> for
            the iterative review loop.
          </p>
          <p className="mt-2 text-xs text-aurora-mute/70">
            {patchMeta.verified
              ? "Data hand-verified."
              : "⚠ Sample data — not yet hand-verified against in-game Wild Rift values."}{" "}
            Sources: {patchMeta.sources.join(" · ")}
          </p>
        </footer>
      </div>
    </main>
  );
}

/* CSS-only mini-mock that hints at each design's visual language. */
function DesignPreview({ id, accent, accent2 }: { id: string; accent: string; accent2: string }) {
  if (id === "aurora") {
    return (
      <div className="relative h-36 overflow-hidden rounded-xl bg-[#0a1020]">
        <div
          className="absolute -left-8 -top-8 h-28 w-28 rounded-full blur-2xl"
          style={{ background: accent, opacity: 0.4 }}
        />
        <div
          className="absolute -right-6 bottom-0 h-24 w-24 rounded-full blur-2xl"
          style={{ background: accent2, opacity: 0.4 }}
        />
        <div className="relative flex h-full gap-2 p-3">
          <div className="w-1/4 space-y-1.5">
            <div className="h-6 rounded-lg border border-white/10 bg-white/5" />
            <div className="h-6 rounded-lg border border-white/10 bg-white/5" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/2 rounded bg-white/10" />
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-7 rounded-lg border border-white/10 bg-white/[0.06]" />
              ))}
            </div>
          </div>
          <div className="w-1/4 rounded-lg border border-white/10 bg-white/[0.06]" />
        </div>
      </div>
    );
  }
  if (id === "hextech") {
    return (
      <div className="relative h-36 overflow-hidden rounded-xl bg-[#0a1428]">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(200,170,110,1) 1px,transparent 1px),linear-gradient(90deg,rgba(200,170,110,1) 1px,transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="relative flex h-full flex-col gap-2 p-3">
          <div
            className="clip-bevel-sm flex items-center gap-2 p-2"
            style={{ border: `1px solid ${accent}66` }}
          >
            <span className="hex-clip h-7 w-7" style={{ background: accent }} />
            <div className="h-2 w-16 rounded" style={{ background: `${accent}99` }} />
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="hex-clip aspect-square"
                style={{ background: i % 2 ? `${accent2}55` : `${accent}55` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  // console
  return (
    <div className="relative h-36 overflow-hidden rounded-xl bg-[#0b0e14] font-mono">
      <div className="flex h-full flex-col p-3 text-[8px] leading-tight" style={{ color: accent }}>
        <div className="mb-1.5 flex gap-1">
          <span className="rounded-sm bg-white/5 px-1">champ▾</span>
          <span className="rounded-sm bg-white/5 px-1">lvl 9</span>
        </div>
        <div className="flex-1 rounded border border-white/10 bg-white/[0.03] p-1.5">
          {["Infinity Edge  3400", "Bloodthirster  3400", "Luden's Echo  3200", "Sunfire   2900"].map(
            (r, i) => (
              <div
                key={i}
                className="flex justify-between border-b border-white/5 py-0.5 text-white/60 last:border-0"
              >
                <span>{r.split("  ")[0]}</span>
                <span style={{ color: accent2 }}>{r.split("  ")[1]}</span>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
