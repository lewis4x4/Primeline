import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        background: "#FFFFFF",
        foreground: "#000000",
        border: "#E5E5E5",
        input: "#E5E5E5",
        ring: "#000000",
        primary: { DEFAULT: "#000000", foreground: "#FFFFFF" },
        secondary: { DEFAULT: "#F5F5F5", foreground: "#000000" },
        muted: { DEFAULT: "#F5F5F5", foreground: "#6B7280" },
        accent: { DEFAULT: "#F5F5F5", foreground: "#000000" },
        destructive: { DEFAULT: "#DC2626", foreground: "#FFFFFF" },
        card: { DEFAULT: "#FFFFFF", foreground: "#000000" },
        popover: { DEFAULT: "#FFFFFF", foreground: "#000000" },
        success: "#16A34A",
        warning: "#D97706",
        info: "#2563EB",
      },
      borderRadius: {
        lg: "4px",
        md: "3px",
        sm: "2px",
      },
      boxShadow: {
        none: "none",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
} satisfies Config;
