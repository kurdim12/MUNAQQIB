import type { Config } from "tailwindcss";

// Arabic-first design system. `font-sans` is wired to the Tajawal next/font
// variable in app/layout.tsx so the whole RTL UI renders in an Arabic typeface.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-arabic)", "system-ui", "sans-serif"],
        // Editorial Arabic serif for headlines — evokes official tender documents.
        serif: ["var(--font-amiri)", "Georgia", "serif"],
      },
      colors: {
        // Warm ink text + paper base keep Arabic readable; a vivid emerald primary
        // and accent drive the "bold modern SaaS" surfaces (CTAs, gradients, highlights).
        ink: { DEFAULT: "#1c1917", soft: "#44403c", muted: "#78716c" },
        paper: "#faf8f4",
        sand: "#efe9df",
        line: "#e7e1d8",
        primary: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
          DEFAULT: "#059669",
        },
        accent: { DEFAULT: "#f59e0b", soft: "#fbbf24" }, // amber energy for highlights
        // Legacy teal alias kept so older screens don't break.
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
          DEFAULT: "#0f766e",
          dark: "#115e59",
          light: "#5eead4",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 16px -8px rgb(15 23 42 / 0.10)",
        "card-hover": "0 12px 40px -14px rgb(5 150 105 / 0.28)",
        glow: "0 10px 40px -10px rgb(5 150 105 / 0.45)",
      },
      backgroundImage: {
        "primary-gradient": "linear-gradient(135deg, #059669 0%, #0d9488 50%, #047857 100%)",
        "hero-glow":
          "radial-gradient(60% 60% at 80% 0%, rgba(16,185,129,0.14) 0%, rgba(16,185,129,0) 60%), radial-gradient(50% 50% at 10% 10%, rgba(245,158,11,0.10) 0%, rgba(245,158,11,0) 55%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
