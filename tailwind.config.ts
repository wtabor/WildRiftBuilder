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
        // ── Meta palette: U.GG-style structure on a trajectory.ai light surface ──
        meta: {
          bg: "#faf9f6",
          bg2: "#ffffff",
          panel: "#ffffff",
          panel2: "#f3f1ec",
          raised: "#ece9e2",
          border: "#e6e3db",
          text: "#1a1a1a",
          mute: "#6f6f78",
          dim: "#a1a1aa",
          blue: "#3b6ef5",
          blue2: "#4f46e5",
          purple: "#6b4be0",
          orange: "#f3683c",
          coral: "#ef4444",
          gold: "#b4831e",
          green: "#16a34a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
