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
  // Stories are Storybook-only: their utilities must not leak into the
  // shipped stylesheet or its size budget (.storybook/tailwind.config.ts
  // scans them instead).
  content: ["./src/**/*.{ts,tsx}", "!./src/**/*.stories.tsx", "!./src/stories/**"],
} satisfies Config;

export default config;
