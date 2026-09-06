import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { StreamingMessage } from "./streaming-message";
import type { StreamStatus } from "./streaming-message.types";
import { streamingAnswer } from "../../stories/fixtures";
import { darkTheme } from "../../stories/decorators";

/** The order the "All states" grid walks the enum in. */
const statuses: readonly StreamStatus[] = [
  "idle",
  "streaming",
  "complete",
  "stopped",
  "error",
];

/** Where the stream stands mid-token: inside the open code fence. */
const partialAnswer = streamingAnswer.slice(0, streamingAnswer.indexOf("weights=") + 8);

const meta = {
  title: "Components/StreamingMessage",
  component: StreamingMessage,
  tags: ["autodocs"],
  args: { content: streamingAnswer, status: "complete" },
  decorators: [
    (Story) => (
      <div className="max-w-prose text-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StreamingMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every `StreamStatus`, each with the controls that status actually offers. */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {statuses.map((status) => (
        <section key={status}>
          <p className="mb-1 text-xs text-fg-muted">{status}</p>
          <StreamingMessage
            {...args}
            status={status}
            content={status === "streaming" ? partialAnswer : args.content}
            error={status === "error" ? "The model stopped responding." : undefined}
            onStop={() => undefined}
            onRegenerate={() => undefined}
            /* One live region per page is plenty; the grid is documentation. */
            announce="off"
          />
        </section>
      ))}
    </div>
  ),
};

export const Dark: Story = { ...AllStates, decorators: [darkTheme] };

/**
 * The contract SPEC section 5.1 asks for: stop and regenerate are two separate
 * buttons in one stable group, so a stream ending under the pointer never
 * swaps the control a keyboard user is about to press. Doubles as the manual
 * screen-reader script.
 */
export const Keyboard: Story = {
  render: (args) => {
    /* Stateful so the play function can drive a real status transition. */
    const [status, setStatus] = React.useState<StreamStatus>("streaming");
    return (
      <StreamingMessage
        {...args}
        status={status}
        content={status === "streaming" ? partialAnswer : streamingAnswer}
        onStop={() => setStatus("stopped")}
        onRegenerate={() => setStatus("streaming")}
      />
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const group = canvas.getByRole("group", { name: "Response actions" });

    await step("Tab reaches Stop while the answer is still streaming", async () => {
      await userEvent.tab();
      const stop = within(group).getByRole("button", { name: "Stop generating" });
      await expect(stop).toHaveFocus();
    });

    await step("Enter stops the stream and Regenerate takes the slot", async () => {
      await userEvent.keyboard("{Enter}");
      await waitFor(() =>
        expect(within(group).getByRole("button", { name: "Regenerate response" })).toBeVisible()
      );
      await expect(
        within(group).queryByRole("button", { name: "Stop generating" })
      ).toBeNull();
    });

    await step("Tab from the top reaches Regenerate, in the same group", async () => {
      await userEvent.tab();
      await expect(within(group).getByRole("button", { name: "Regenerate response" })).toHaveFocus();
    });
  },
};

/** JurisGPT: a finished answer with a copy affordance beside regenerate. */
export const Realistic: Story = {
  args: {
    announceOn: "sentence",
    onRegenerate: () => undefined,
    actions: (
      <button
        type="button"
        className="rounded-sm border border-border px-2 py-1 text-xs text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Copy
      </button>
    ),
  },
};
