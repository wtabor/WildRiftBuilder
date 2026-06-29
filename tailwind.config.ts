import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Geist (self-hosted via the `geist` package — bundled woff2, no build-time
        // network fetch), with robust system fallbacks.
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      colors: {
        // ── Meta palette: dark hextech surface, gold + blue accents ──
        // Wild Rift's brand (and every competitor: op.gg, u.gg, mobalytics) is
        // dark and high-contrast. Deep ink-navy surfaces, layered elevation,
        // brightened accents tuned to read on a dark field.
        meta: {
          bg: "#0a0d16",      // app base — deep ink-navy
          bg2: "#0f1320",     // rail / top bar
          panel: "#141926",   // card surface
          panel2: "#1b2130",  // raised inputs / chips
          raised: "#232b3c",  // hover / raised affordances
          border: "#283042",  // hairline border
          text: "#eef1f7",    // primary text
          mute: "#8b94a8",    // secondary text
          dim: "#5a6378",     // tertiary text
          blue: "#4d86f7",    // primary accent
          blue2: "#7c8cff",   // lighter indigo (links, "B" side)
          purple: "#a07cf0",
          orange: "#fb8a4c",
          coral: "#f4606b",
          gold: "#e0b24d",    // hextech gold
          green: "#34d399",
        },
      },
    },
  },
  plugins: [],
};

export default config;
