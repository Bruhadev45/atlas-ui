import type { Preview, ReactRenderer } from "@storybook/react";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import "./preview.css";

const preview: Preview = {
  parameters: {
    a11y: { test: "error" }, // a11y violations fail the story
    controls: { expanded: true },
    backgrounds: { disable: true }, // theming comes from data-theme, not backgrounds
  },
  decorators: [
    withThemeByDataAttribute<ReactRenderer>({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
  ],
};

export default preview;
