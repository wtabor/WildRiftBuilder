import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wild Rift Builder — Stat & Build Calculator",
  description:
    "An accurate, current, interactive stat and build calculator for League of Legends: Wild Rift.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
