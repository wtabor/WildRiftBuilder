import type { Metadata } from "next";
import MetaDesign from "@/designs/meta/MetaDesign";

export const metadata: Metadata = {
  title: "Meta · Wild Rift Builder",
  description: "Wild Rift stat & build calculator — Meta design (U.GG-style stats aggregator / build guide).",
};

export default function Page() {
  return <MetaDesign />;
}
