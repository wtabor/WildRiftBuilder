import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // No network font fetch at build time — robust system stacks per design.
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        display: ['"Trajan Pro"', 'Georgia', '"Times New Roman"', 'serif'],
        mono: ['ui-monospace', '"SF Mono"', 'SFMono-Regular', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'],
      },
      colors: {
        // ── Hextech / Wild Rift in-game palette (Design: Hextech Arsenal) ──
        rift: {
          bg: "#0a1428",
          panel: "#0f1c33",
          panel2: "#091020",
          border: "#1e3a5f",
          gold: "#c8aa6e",
          gold2: "#f0e6d2",
          blue: "#0ac8b9",
          ad: "#e0964e",
          ap: "#3a9bdc",
          tank: "#d05858",
        },
        // ── Aurora (Design: modern premium SaaS) ──
        aurora: {
          bg: "#070b16",
          surface: "#0c1322",
          teal: "#2dd4bf",
          violet: "#a78bfa",
          pink: "#f472b6",
          ink: "#e6ebff",
          mute: "#9aa6c4",
        },
        // ── Console (Design: dense analytics terminal) ──
        con: {
          bg: "#0b0e14",
          panel: "#11151f",
          panel2: "#0d1118",
          border: "#1f2733",
          grid: "#161c27",
          text: "#c9d1d9",
          mute: "#8b949e",
          accent: "#3fb950",
          amber: "#d29922",
          red: "#f85149",
          blue: "#58a6ff",
        },
        // ── Meta (Design: U.GG-style structure, trajectory.ai light palette) ──
        meta: {
          bg: "#f7f5f1",
          bg2: "#ffffff",
          panel: "#ffffff",
          panel2: "#f4f2ee",
          raised: "#eceae4",
          border: "#e7e4dd",
          text: "#17171a",
          mute: "#71717a",
          dim: "#a1a1aa",
          blue: "#2f5bea",
          blue2: "#2547c8",
          purple: "#6b4be0",
          coral: "#ef4444",
          gold: "#b4831e",
          green: "#16a34a",
        },
      },
      keyframes: {
        "aurora-drift": {
          "0%, 100%": { transform: "translate3d(-4%, -2%, 0) scale(1.05)" },
          "50%": { transform: "translate3d(4%, 3%, 0) scale(1.15)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "aurora-drift": "aurora-drift 18s ease-in-out infinite",
        "fade-up": "fade-up 0.4s ease-out both",
        "pop-in": "pop-in 0.25s ease-out both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
