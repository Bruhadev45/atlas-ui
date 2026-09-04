import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { TokenMeter } from "./token-meter";
import {
  tokenBudget,
  tokenPricing,
  tokenUsage,
  tokenUsageDetailed,
} from "../../stories/fixtures";
import { darkTheme } from "../../stories/decorators";

const meta = {
  title: "Components/TokenMeter",
  component: TokenMeter,
  tags: ["autodocs"],
  args: { usage: tokenUsage, budget: tokenBudget, locale: "en-US" },
} satisfies Meta<typeof TokenMeter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Under budget, past `warn`, past `danger`, over, and the no-budget count. */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex max-w-xl flex-col gap-4">
      {[
        ["27% — nominal", 34_512],
        ["78% — warning", 99_840],
        ["94% — danger", 120_320],
        ["112% — over budget", 143_360],
      ].map(([label, total]) => (
        <div key={label as string}>
          <p className="mb-1 text-xs text-fg-muted">{label}</p>
          <TokenMeter
            {...args}
            usage={{ prompt: Math.round((total as number) * 0.82), completion: Math.round((total as number) * 0.18) }}
          />
        </div>
      ))}
      <div>
        <p className="mb-1 text-xs text-fg-muted">no budget — counts only</p>
        <TokenMeter {...args} budget={undefined} />
      </div>
    </div>
  ),
};

export const Dark: Story = { ...AllStates, decorators: [darkTheme] };

/** The collapsible control is reachable by Tab and toggles with Enter. */
export const Keyboard: Story = {
  args: { collapsible: true, usage: tokenUsageDetailed, pricing: tokenPricing },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const toggle = canvas.getByRole("button", { name: "Show details" });

    await step("Tab reaches the details toggle", async () => {
      await userEvent.tab();
      await expect(toggle).toHaveFocus();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    await step("Enter expands the breakdown", async () => {
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(toggle).toHaveAttribute("aria-expanded", "true"));
      await expect(canvas.getByRole("button", { name: "Hide details" })).toHaveFocus();
    });

    await step("Enter collapses it again", async () => {
      await userEvent.keyboard("{Enter}");
      await waitFor(() =>
        expect(canvas.getByRole("button", { name: "Show details" })).toHaveAttribute(
          "aria-expanded",
          "false"
        )
      );
    });
  },
};

/** FinSight: a cached, extended-thinking turn against a 128k window, priced. */
export const Realistic: Story = {
  args: {
    usage: tokenUsageDetailed,
    pricing: tokenPricing,
    variant: "expanded",
    budgetLabel: "Context window",
  },
  render: (args) => (
    <div className="max-w-xl">
      <TokenMeter {...args} />
    </div>
  ),
};
