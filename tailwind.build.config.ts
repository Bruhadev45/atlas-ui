import type { Config } from "tailwindcss";
import atlasPreset from "./tailwind/preset";

/**
 * Builds the prebuilt dist/styles.css (Mode A, no-Tailwind consumers).
 * `preflight: false` is non-negotiable: shipping preflight in a library
 * stylesheet would reset the consumer's application (SPEC.md section 2.2).
 */
const config = {
  presets: [atlasPreset],
  corePlugins: { preflight: false },
  content: ["./src/**/*.{ts,tsx}"],
} satisfies Config;

export default config;
