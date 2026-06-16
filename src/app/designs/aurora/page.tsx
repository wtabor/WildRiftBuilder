import type { Metadata } from "next";
import AuroraDesign from "@/designs/aurora/AuroraDesign";

export const metadata: Metadata = {
  title: "Aurora · Wild Rift Builder",
  description: "Wild Rift stat & build calculator — Aurora design (modern, premium, glassmorphic).",
};

export default function Page() {
  return <AuroraDesign />;
}
