import type { Metadata } from "next";
import HextechDesign from "@/designs/hextech/HextechDesign";

export const metadata: Metadata = {
  title: "Hextech Arsenal · Wild Rift Builder",
  description: "Wild Rift stat & build calculator — Hextech Arsenal design (immersive in-game HUD).",
};

export default function Page() {
  return <HextechDesign />;
}
