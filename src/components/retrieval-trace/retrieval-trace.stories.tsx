import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { RetrievalTrace } from "./retrieval-trace";
import { retrievalQuery, retrievedChunks, retrievers } from "../../stories/fixtures";
import { darkTheme } from "../../stories/decorators";

const meta = {
  title: "Components/RetrievalTrace",
  component: RetrievalTrace,
  tags: ["autodocs"],
  args: { chunks: retrievedChunks, retrievers },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RetrievalTrace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The states a trace moves through: both score displays, both densities, a
 * selected row, and the empty result. The a11y and contrast checks run here.
 */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {(["normalized", "raw", "both"] as const).map((scoreDisplay) => (
        <section key={scoreDisplay}>
          <p className="mb-1 text-xs text-fg-muted">{`scoreDisplay="${scoreDisplay}"`}</p>
          <RetrievalTrace {...args} scoreDisplay={scoreDisplay} />
        </section>
      ))}
      <section>
        <p className="mb-1 text-xs text-fg-muted">compact, expanded, second hit selected</p>
        <RetrievalTrace
          {...args}
          density="compact"
          defaultExpandedKeys={["ipc-149"]}
          selectedKey="crpc-107"
        />
      </section>
      <section>
        <p className="mb-1 text-xs text-fg-muted">nothing retrieved</p>
        <RetrievalTrace {...args} chunks={[]} />
      </section>
    </div>
  ),
};

/* Story decorators compose with the meta one, so the width wrapper stays. */
export const Dark: Story = { ...AllStates, decorators: [darkTheme] };

/**
 * A reader auditing the retrieval: Tab lands on the first hit's disclosure,
 * Enter opens it, Enter closes it, Tab moves to the next hit. Doubles as the
 * manual screen-reader script.
 */
export const Keyboard: Story = {
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const first = canvas.getByRole("button", { name: /Indian Penal Code, 1860/ });
    const second = canvas.getByRole("button", { name: /Code of Criminal Procedure, 1973/ });

    await step("Tab reaches the top hit, collapsed", async () => {
      await userEvent.tab();
      await expect(first).toHaveFocus();
      await expect(first).toHaveAttribute("aria-expanded", "false");
    });

    await step("Enter opens the full chunk", async () => {
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(first).toHaveAttribute("aria-expanded", "true"));
      await expect(first).toHaveFocus();
    });

    await step("Enter closes it again", async () => {
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(first).toHaveAttribute("aria-expanded", "false"));
    });

    await step("Tab moves on to the next hit", async () => {
      await userEvent.tab();
      await expect(second).toHaveFocus();
    });
  },
};

/** JurisGPT: the fused ranking behind an answer, with the query terms marked. */
export const Realistic: Story = {
  args: {
    query: retrievalQuery,
    highlightQueryTerms: true,
    scoreDisplay: "both",
    defaultExpandedKeys: ["ipc-149"],
  },
};
