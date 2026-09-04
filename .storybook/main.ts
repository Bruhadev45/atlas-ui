import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials", // docs, controls, viewport, backgrounds
    "@storybook/addon-a11y", // axe-core panel, per story
    "@storybook/addon-themes", // light/dark toggle
  ],
  framework: { name: "@storybook/react-vite", options: {} },
  docs: { autodocs: "tag" },
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      // keep React's HTMLAttributes out of every props table
      propFilter: (prop) => !/node_modules\/@types\/react/.test(prop.parent?.fileName ?? ""),
    },
  },
  /*
   * The canvas needs Tailwind, but the repo has no root PostCSS config on
   * purpose: `npm run build:css` drives Tailwind through its own CLI and a
   * root postcss.config would be picked up there too. Pointing Vite at the
   * .storybook directory keeps the PostCSS pipeline scoped to Storybook.
   */
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    css: { ...viteConfig.css, postcss: join(projectRoot, ".storybook") },
  }),
};

export default config;
