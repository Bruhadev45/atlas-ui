import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { ToolCallTimeline } from "./tool-call-timeline";
import type { ToolCallStatus } from "./tool-call-timeline.types";
import { toolCalls } from "../../stories/fixtures";
import { darkTheme } from "../../stories/decorators";

/** The order the "All states" grid walks the enum in. */
const statuses: readonly ToolCallStatus[] = [
  "pending",
  "running",
  "ok",
  "error",
  "cancelled",
];

const meta = {
  title: "Components/ToolCallTimeline",
  component: ToolCallTimeline,
  tags: ["autodocs"],
  args: { calls: toolCalls },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ToolCallTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every `ToolCallStatus` in one list — the contrast check runs here. */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      <ToolCallTimeline
        {...args}
        calls={statuses.map((status) => ({
          id: status,
          name: `retrieve_${status}`,
          status,
          durationMs: status === "pending" ? undefined : 240,
          error: status === "error" ? "embedding service timed out" : undefined,
        }))}
      />
      <section>
        <p className="mb-1 text-xs text-fg-muted">compact, everything open</p>
        <ToolCallTimeline {...args} density="compact" defaultExpandAll />
      </section>
      <section>
        <p className="mb-1 text-xs text-fg-muted">nothing ran</p>
        <ToolCallTimeline {...args} calls={[]} />
      </section>
    </div>
  ),
};

export const Dark: Story = { ...AllStates, decorators: [darkTheme] };

/*
 * The accessible-name algorithm joins element children with a space, so the
 * sr-only status suffix computes as "hybrid_retrieve , Succeeded". Speech
 * output is unaffected; normalise the seam so the queries stay readable.
 */
function row(canvas: ReturnType<typeof within>, pattern: RegExp): HTMLElement {
  return canvas.getByRole("button", {
    name: (name: string) => pattern.test(name.replace(" ,", ",")),
  });
}

/**
 * The additive arrow keys of SPEC section 5.4: they act only when a row itself
 * has focus, so Tab order stays native and nothing is trapped. Doubles as the
 * manual screen-reader script.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const classify = row(canvas, /^classify_query, Succeeded/);
    const retrieve = row(canvas, /^hybrid_retrieve, Succeeded/);

    await step("Tab reaches the first call, collapsed", async () => {
      await userEvent.tab();
      await expect(classify).toHaveFocus();
      await expect(classify).toHaveAttribute("aria-expanded", "false");
    });

    await step("ArrowRight opens it, ArrowLeft closes it", async () => {
      await userEvent.keyboard("{ArrowRight}");
      await waitFor(() => expect(classify).toHaveAttribute("aria-expanded", "true"));
      await userEvent.keyboard("{ArrowLeft}");
      await waitFor(() => expect(classify).toHaveAttribute("aria-expanded", "false"));
    });

    await step("End jumps to the last row, ArrowRight opens its children", async () => {
      await userEvent.keyboard("{End}");
      await expect(retrieve).toHaveFocus();
      await userEvent.keyboard("{ArrowRight}");
      await waitFor(() => expect(retrieve).toHaveAttribute("aria-expanded", "true"));
    });

    await step("ArrowRight again steps into the child, ArrowLeft back out", async () => {
      await userEvent.keyboard("{ArrowRight}");
      await waitFor(() => expect(row(canvas, /^bm25_search/)).toHaveFocus());
      await userEvent.keyboard("{ArrowLeft}");
      await expect(retrieve).toHaveFocus();
    });

    await step("Home returns to the first row", async () => {
      await userEvent.keyboard("{Home}");
      await expect(classify).toHaveFocus();
    });
  },
};

/**
 * JurisGPT: one answer's agent loop, with the failed sub-search open. The
 * classifier's `apiKey` argument is redacted by default — that is the point.
 */
export const Realistic: Story = {
  args: { defaultExpandedIds: ["t1", "t2"], announceStatusChanges: true },
};
