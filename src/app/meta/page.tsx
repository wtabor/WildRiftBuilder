import type { Metadata } from "next";
import Link from "next/link";
import MetaDesign from "@/designs/meta/MetaDesign";

export const metadata: Metadata = {
  title: "Meta design (deprecated) — Wild Rift Builder",
  description: "Deprecated original Wild Rift Builder design. The default experience now lives at /.",
  robots: { index: false, follow: false },
};

/**
 * Deprecated design, kept reachable for reference/comparison. The default
 * experience is now the AerStrike design at `/`.
 */
export default function Page() {
  return (
    <>
      <div className="bg-amber-500/15 px-4 py-2 text-center text-sm text-amber-200">
        This design is deprecated. The current Wild Rift Builder lives at{" "}
        <Link href="/" className="font-semibold underline underline-offset-2">
          the home page
        </Link>
        .
      </div>
      <MetaDesign />
    </>
  );
}
