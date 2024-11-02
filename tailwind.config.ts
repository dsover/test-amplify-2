import type { Config } from "tailwindcss";
const {nextui} = require("@nextui-org/react");


const config: Config = {
  content: [
   './src/**/*.{js,ts,jsx,tsx}',
    './public/index.html',
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  darkMode: "class",
  plugins: [nextui()],
};
export default config;
