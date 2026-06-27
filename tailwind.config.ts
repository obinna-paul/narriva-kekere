import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mirrors src/components/theme/narriva-theme.tsx — see that file for
        // provenance (the design handoff README) and notes on each token.
        "narriva-primary": "#1E3A8A",
        "narriva-primary-light": "#162C6B",
        "narriva-bg": "#FAF8F4",
        "narriva-bg-alt": "#F6F3ED",
        "narriva-ink": "#161616",
        "narriva-accent": "#B08D57",
        "narriva-accent-text": "#9A7B49",
        "narriva-muted": "#55514A",
        "narriva-muted-2": "#6B675F",
        "narriva-muted-3": "#8A857C",

        // Mirrors src/components/theme/kekere-theme.tsx — see that file for
        // provenance and notes on legacy aliases (maroon/gold).
        "kekere-primary": "#C75D2C",
        "kekere-primary-light": "#B14E22",
        "kekere-primary-muted": "#F6DCC8",
        "kekere-bg": "#F5EBDD",
        "kekere-bg-warm": "#EFE1CE",
        "kekere-ink": "#2A1A12",
        "kekere-ink-muted": "#6A5446",
        "kekere-ink-muted-2": "#8A7565",
        "kekere-ink-muted-3": "#A08C7C",
        "kekere-accent": "#1F4B4B",
        "kekere-accent-light": "#2D6B6B",
        "kekere-surface": "#FFFFFF",
        "kekere-border": "#E8D5C4",
        "kekere-cream": "#F7EFE3",
        "kekere-success": "#1F6F4A",
        "kekere-sand-accent": "#E9C9A3",
        "kekere-sand-accent-2": "#E08A4A",
        "kekere-maroon": "#2A1A12",
        "kekere-maroon-deep": "#2A1A12",
        "kekere-dark-2": "#3A2418",
        "kekere-gold": "#E08A4A",
        "kekere-gold-light": "#E9C9A3",
      },
      fontFamily: {
        display: ["var(--font-fraunces)"],
        body: ["var(--font-inter)"],
      },
      backgroundImage: {
        "kekere-texture":
          "radial-gradient(circle at 20% 50%, #F6DCC8 0%, transparent 50%), radial-gradient(circle at 80% 20%, #EFE1CE 0%, transparent 40%)",
        "kekere-card-texture":
          "linear-gradient(135deg, rgba(199,93,44,0.15) 0%, transparent 60%)",
        // West African textile-inspired diamond grid — used as a low-opacity
        // overlay on the dark hero/banner sections (see
        // AfricanPatternOverlay). Two offset 45deg checkerboards form
        // diamonds rather than squares.
        "kekere-diamond":
          "linear-gradient(45deg, rgba(224,138,74,0.07) 25%, transparent 25%, transparent 75%, rgba(224,138,74,0.07) 75%), linear-gradient(45deg, rgba(224,138,74,0.07) 25%, transparent 25%, transparent 75%, rgba(224,138,74,0.07) 75%)",
      },
      animation: {
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
