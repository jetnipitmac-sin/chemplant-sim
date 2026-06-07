import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // industrial control-room palette
        base: "#080b11",
        panel: "#0f151e",
        "panel-2": "#141c27",
        "panel-3": "#1b2532",
        edge: "#243140",
        ink: "#e6edf5",
        muted: "#8295ab",
        brand: { DEFAULT: "#22d3ee", dim: "#0e7490", deep: "#155e75" },
        ok: "#34d399",
        warn: "#f59e0b",
        crit: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34,211,238,0.25), 0 0 24px -6px rgba(34,211,238,0.45)",
        "glow-crit": "0 0 0 1px rgba(239,68,68,0.4), 0 0 28px -4px rgba(239,68,68,0.6)",
        "glow-warn": "0 0 0 1px rgba(245,158,11,0.35), 0 0 24px -6px rgba(245,158,11,0.5)",
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 30px -12px rgba(0,0,0,0.7)",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.25" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.7" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        flow: {
          to: { strokeDashoffset: "-16" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1s steps(2, start) infinite",
        "pulse-ring": "pulse-ring 1.6s ease-out infinite",
        flow: "flow 0.6s linear infinite",
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
