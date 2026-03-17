import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#0F1D35",
          mid: "#1B2A4A",
          light: "#253A5E",
        },
        gold: {
          DEFAULT: "#C8A55B",
          light: "#D4B978",
          pale: "#F0E6CE",
        },
        cream: "#F8F5EF",
        "warm-white": "#FDFBF7",
        charcoal: {
          DEFAULT: "#2D2D2D",
          light: "#5A5A5A",
        },
        teal: {
          DEFAULT: "#2A7F6F",
          light: "#34997F",
        },
        sage: "#8FA89A",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "serif"],
        body: ["Outfit", "sans-serif"],
        ui: ["DM Sans", "sans-serif"],
      },
      screens: {
        mobile: "0px",
        tablet: "641px",
        desktop: "1025px",
      },
    },
  },
  plugins: [],
};

export default config;
