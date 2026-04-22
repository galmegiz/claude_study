import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f1ff",
          100: "#e6dfff",
          500: "#7b61ff",
          600: "#5a3fe0",
          700: "#3f28a8",
        },
      },
    },
  },
  plugins: [],
};

export default config;
