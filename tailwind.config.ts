import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        seazone: {
          primary: "#1F4E78",
          secondary: "#2E75B6",
          accent: "#3B9AE1",
          light: "#E8F4FD",
          dark: "#0D2B45",
        },
      },
    },
  },
  plugins: [],
};

export default config;
