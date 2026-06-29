import type { Metadata } from "next";
import AerstrikeDesign from "@/designs/aerstrike/AerstrikeDesign";

export const metadata: Metadata = {
  title: "AerStrike · Wild Rift Builder",
  description:
    "Experimental AerStrike-styled variant of the Wild Rift stat & build calculator — dark, monospaced, terminal-flavored.",
};

export default function Page() {
  return <AerstrikeDesign />;
}
