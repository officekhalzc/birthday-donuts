import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink:    "#2E2440",  // deep blueberry — all text and headings
        paper:  "#FDFBF4",  // buttercream page background
        muted:  "#7A7086",
        line:   "#EAE3D6",
        honey:  "#E8A33D",  // primary action
        honeyd: "#C9861F",
        berry:  "#B0416B",  // birthday accent
        berryl: "#F7E8EE",
        pistachio: "#6F9B78", // delivered / success
        pistachiol: "#E8F1E9",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: { card: "18px", pill: "999px" },
      boxShadow: {
        card: "0 1px 2px rgba(46,36,64,.04), 0 8px 24px -12px rgba(46,36,64,.14)",
      },
    },
  },
  plugins: [],
};
export default config;
