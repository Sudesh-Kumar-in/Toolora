import type { Config } from "tailwindcss";

/**
 * Toolora design tokens.
 * ink    – text and primary surfaces (deep blue-black, not pure #000)
 * paper  – warm off-white page background
 * cobalt – the single accent, used for focus, active states and key actions
 * amber  – used sparingly for status and highlights
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#101820",
          soft: "#2A3642",
          mute: "#5B6672",
        },
        paper: {
          DEFAULT: "#F5F3EE",
          raised: "#FFFFFF",
          sunk: "#ECEAE4",
        },
        cobalt: {
          DEFAULT: "#2B4EFF",
          deep: "#1C35C4",
          wash: "#E8EDFF",
        },
        amber: {
          DEFAULT: "#E8B04B",
          wash: "#FBF1DC",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(16,24,32,0.04), 0 1px 2px rgba(16,24,32,0.04)",
        lift: "0 12px 32px -12px rgba(16,24,32,0.18)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 480ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
