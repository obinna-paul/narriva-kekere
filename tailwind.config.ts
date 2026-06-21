import type { Config } from "tailwindcss";

// IMPORTANT: Narriva and Kekere are independent brands (see README.md).
// Do not add a shared "brand" color token that both namespaces reference —
// each brand's tokens must stay fully separate, even if a value happens to match.
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Narriva — selective book publishing house & bookstore
        "narriva-primary": "#1E3A8A",
        "narriva-primary-light": "#2541B2",
        "narriva-bg": "#FAF8F4",
        "narriva-ink": "#161616",
        "narriva-accent": "#B08D57",

        // Kekere Stories — short-fiction reading and writing app
        "kekere-primary": "#C75D2C",
        "kekere-primary-light": "#D2691E",
        "kekere-bg": "#F5EBDD",
        "kekere-ink": "#2A1A12",
        "kekere-accent": "#1F4B4B",
      },
      fontFamily: {
        display: ["var(--font-fraunces)"],
        body: ["var(--font-inter)"],
      },
    },
  },
  plugins: [],
};

export default config;
