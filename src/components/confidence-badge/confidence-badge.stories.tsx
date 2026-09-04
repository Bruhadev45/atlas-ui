import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { ConfidenceBadge } from "./confidence-badge";
import { confidenceFromScore } from "./confidence";
import { confidenceLevels } from "../../stories/fixtures";
import { darkTheme } from "../../stories/decorators";

const meta = {
  title: "Components/ConfidenceBadge",
  component: ConfidenceBadge,
  tags: ["autodocs"],
  args: { level: "high", score: 0.91, showScore: true },
} satisfies Meta<typeof ConfidenceBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every `ConfidenceLevel` against every variant — the contrast check runs here. */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-3">
      {(["soft", "solid", "outline"] as const).map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-3">
          {confidenceLevels.map((level) => (
            <ConfidenceBadge key={level} {...args} level={level} variant={variant} />
          ))}
        </div>
      ))}
    </div>
  ),
};

export const Dark: Story = { ...AllStates, decorators: [darkTheme] };

/**
 * Tab reaches the calibration button, Enter opens the popover, Escape closes it
 * and hands focus back. Doubles as the manual screen-reader script.
 */
export const Keyboard: Story = {
  args: {
    calibrationAs: "popover",
    calibration: "Fused retrieval score over 5 sources, thresholded at 0.85 / 0.6 / 0.35.",
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const info = canvas.getByRole("button", { name: "How this is calculated" });

    await step("Tab moves focus to the calibration button", async () => {
      await userEvent.tab();
      await expect(info).toHaveFocus();
      await expect(info).toHaveAttribute("aria-expanded", "false");
    });

    await step("Enter opens the explainer", async () => {
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(info).toHaveAttribute("aria-expanded", "true"));
    });

    await step("Escape closes it and returns focus", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(info).toHaveAttribute("aria-expanded", "false"));
      await expect(info).toHaveFocus();
    });
  },
};

/** JurisGPT: the badge as it sits under a grounded answer. */
export const Realistic: Story = {
  args: {
    level: confidenceFromScore(0.91),
    score: 0.91,
    description: "based on 5 sources",
    calibration: "Fused retrieval score over 5 sources, thresholded at 0.85 / 0.6 / 0.35.",
  },
  render: (args) => (
    <p className="max-w-prose text-sm text-fg">
      A common object requires shared intent, not mere presence.{" "}
      <ConfidenceBadge {...args} />
    </p>
  ),
};
