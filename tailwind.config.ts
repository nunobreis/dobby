import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
      },
      colors: {
        background: "#EFEFEF",
        accent: "#8B5CF6",
        "text-primary": "#1A1A1A",
        "text-secondary": "#7A7A7A",
        "blush-pink": "#F2C4CE",
        lavender: "#D5C9F0",
        "sage-green": "#C5DDD1",
        "warm-peach": "#F5DEC8",
        "sky-blue": "#C2DCF0",
        "soft-yellow": "#F5EAC2",
      },
      borderRadius: {
        card: "20px",
        input: "12px",
        badge: "20px",
        pill: "28px",
      },
    },
  },
  plugins: [],
};
export default config;
