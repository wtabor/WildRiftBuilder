import type { Metadata } from "next";
import MetaDesign from "@/designs/meta/MetaDesign";

export const metadata: Metadata = {
  title: "Wild Rift Builder — champion stats & item build calculator",
  description:
    "Pick a champion, set the level, and stack items to see accurate, patch-versioned Wild Rift stats and build paths.",
};

export default function Page() {
  return <MetaDesign />;
}
