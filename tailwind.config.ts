import type { Config } from "tailwindcss";
const v = (n: string) => `rgb(var(--${n}) / <alpha-value>)`;
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: { colors: {
    bg: v("bg"), panel: v("panel"), panel2: v("panel2"), line: v("line"),
    fg: v("fg"), mute: v("mute"), up: v("up"), down: v("down"), warn: v("warn"), info: v("info"),
  }, fontFamily: { sans: ["Inter","system-ui","sans-serif"], mono: ["ui-monospace","SFMono-Regular","Menlo","monospace"] } } },
  plugins: [],
} satisfies Config;
