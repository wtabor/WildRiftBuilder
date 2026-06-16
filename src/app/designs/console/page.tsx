import type { Metadata } from "next";
import ConsoleDesign from "@/designs/console/ConsoleDesign";

export const metadata: Metadata = {
  title: "Stat Console · Wild Rift Builder",
  description: "Wild Rift stat & build calculator — Stat Console design (dense pro analytics terminal).",
};

export default function Page() {
  return <ConsoleDesign />;
}
