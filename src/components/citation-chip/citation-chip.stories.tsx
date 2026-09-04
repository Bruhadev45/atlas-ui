import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { CitationChip } from "./citation-chip";
import { citationSource, citationSources } from "../../stories/fixtures";
import { darkTheme } from "../../stories/decorators";

const meta = {
  title: "Components/CitationChip",
  component: CitationChip,
  tags: ["autodocs"],
  args: { source: citationSource, index: 1 },
} satisfies Meta<typeof CitationChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Both tones across all three chip variants. */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(["neutral", "accent"] as const).map((tone) => (
        <div key={tone} className="flex flex-wrap items-center gap-3">
          <CitationChip {...args} tone={tone} variant="numeric" />
          <CitationChip {...args} tone={tone} variant="dot" />
          <CitationChip {...args} tone={tone} variant="text" label="IPC § 149" />
        </div>
      ))}
    </div>
  ),
};

export const Dark: Story = { ...AllStates, decorators: [darkTheme] };

/**
 * The path a keyboard-only reader takes through a citation: Tab opens the
 * preview on focus, Enter pins it and moves focus inside, Escape closes it and
 * hands focus back to the chip. Doubles as the manual screen-reader script.
 */
export const Keyboard: Story = {
  args: { openOnHover: false },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const chip = canvas.getByRole("button", {
      name: "Citation 1: Indian Penal Code, 1860 \u00a7 149",
    });

    await step("Tab focuses the chip, which opens the preview", async () => {
      await userEvent.tab();
      await expect(chip).toHaveFocus();
      await waitFor(() => expect(chip).toHaveAttribute("aria-expanded", "true"));
    });

    await step("Enter pins the preview and moves focus into it", async () => {
      await userEvent.keyboard("{Enter}");
      // Radix portals the preview out of the canvas, so query the document.
      const dialog = await within(document.body).findByRole("dialog");
      await waitFor(() =>
        expect(dialog).toContainElement(document.activeElement as HTMLElement | null)
      );
    });

    await step("Escape closes the preview and returns focus to the chip", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(chip).toHaveAttribute("aria-expanded", "false"));
      await expect(chip).toHaveFocus();
    });
  },
};

/** JurisGPT: three chips inline in a grounded answer, numbered as they appear. */
export const Realistic: Story = {
  render: (args) => (
    <p className="max-w-prose text-sm leading-7 text-fg">
      An assembly of five or more persons becomes unlawful only when its members share
      one of the enumerated common objects
      <CitationChip {...args} index={2} source={citationSources[1]!} />, and every member
      is then liable for offences committed in prosecution of that object
      <CitationChip {...args} index={1} source={citationSources[0]!} />. Where the crowd
      is large, conviction of an individual still needs corroboration
      <CitationChip {...args} index={3} source={citationSources[2]!} />.
    </p>
  ),
};
