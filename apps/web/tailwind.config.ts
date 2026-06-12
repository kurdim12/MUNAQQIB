import type { Config } from "tailwindcss";

// Arabic-first palette. `font-sans` is wired to the Tajawal next/font variable
// in app/layout.tsx so the whole RTL UI renders in an Arabic typeface.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#0f766e", // teal-700 — منقّب accent
          dark: "#115e59",
          light: "#5eead4",
        },
      },
    },
  },
  plugins: [],
};

export default config;
