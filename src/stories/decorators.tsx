import * as React from "react";
import type { Decorator } from "@storybook/react";

/**
 * Forces `data-theme="dark"` on a wrapper so a token regression shows up in the
 * story list without anyone toggling the global theme (SPEC section 7, story
 * kind 3). The attribute is the same switch consumers flip, and tokens.css
 * matches it on any element, not just <html>.
 */
export const darkTheme: Decorator = (Story) => (
  <div data-theme="dark" className="rounded-lg bg-surface p-6 text-fg">
    <Story />
  </div>
);
