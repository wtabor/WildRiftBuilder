import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Wild Rift / Hextech-inspired palette
        rift: {
          bg: "#0a1428",
          panel: "#0f1c33",
          border: "#1e3a5f",
          gold: "#c8aa6e",
          gold2: "#f0e6d2",
          blue: "#0ac8b9",
          ad: "#e0964e",
          ap: "#3a9bdc",
          tank: "#d05858",
        },
      },
    },
  },
  plugins: [],
};

export default config;
