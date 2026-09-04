import type { Config } from "tailwindcss";
import atlasPreset from "../tailwind/preset";

/**
 * Tailwind for the Storybook canvas. Same preset and the same
 * `preflight: false` contract as the shipped dist/styles.css, so a story
 * renders what a consumer gets — no Storybook-only styling path (SPEC
 * section 7). Story files are scanned here but deliberately not in
 * tailwind.build.config.ts, which must stay limited to component source.
 */
const config = {
  presets: [atlasPreset],
  corePlugins: { preflight: false },
  content: ["./src/**/*.{ts,tsx}", "./.storybook/**/*.{ts,tsx}"],
} satisfies Config;

export default config;
