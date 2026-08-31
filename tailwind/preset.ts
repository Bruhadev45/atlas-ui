// Tailwind 3.4 preset (Mode B). Maps a semantic colour scale onto the
// atlas-ui CSS variables so utilities dedupe with the consumer's own.
import type { Config } from "tailwindcss";

const c = (name: string) => `hsl(var(--atlas-${name}) / <alpha-value>)`;

export const atlasPreset = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: c("surface"), raised: c("surface-raised"), sunken: c("surface-sunken") },
        fg:      { DEFAULT: c("fg"), muted: c("fg-muted"), subtle: c("fg-subtle") },
        border:  c("border"),
        ring:    c("ring"),
        accent:  { DEFAULT: c("accent"), fg: c("accent-fg") },
        success: c("success"),
        warning: c("warning"),
        danger:  c("danger"),
        info:    c("info"),
        conf: {
          high: c("conf-high"), medium: c("conf-medium"),
          low: c("conf-low"), insufficient: c("conf-insufficient"),
        },
      },
      borderRadius: {
        DEFAULT: "var(--atlas-radius)",
        sm: "var(--atlas-radius-sm)",
        lg: "var(--atlas-radius-lg)",
      },
      transitionTimingFunction: { atlas: "var(--atlas-ease)" },
      transitionDuration: { atlas: "var(--atlas-duration)" },
    },
  },
} satisfies Partial<Config>;

export default atlasPreset;
