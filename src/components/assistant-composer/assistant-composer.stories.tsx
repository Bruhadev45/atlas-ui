import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { AssistantComposer } from "./assistant-composer";
import type { ComposerStatus } from "./assistant-composer.types";
import { composerAttachments, slashCommands } from "../../stories/fixtures";
import { darkTheme } from "../../stories/decorators";

/** The order the "All states" grid walks the enum in. */
const composerStatuses: readonly ComposerStatus[] = ["idle", "submitting", "streaming"];

/*
 * `role="combobox"` on a <textarea> overrides the native role, which axe flags
 * categorically. SPEC section 5.7 takes that trade knowingly — it is the
 * pattern a multi-line editor with a command menu needs — and puts the
 * combination on the manual screen-reader checklist instead. The rule is off
 * only for the stories that supply commands; every other rule stays on.
 */
const commandMenuA11y = {
  a11y: { config: { rules: [{ id: "aria-allowed-role", enabled: false }] } },
};

const meta = {
  title: "Components/AssistantComposer",
  component: AssistantComposer,
  tags: ["autodocs"],
  args: { onSubmit: () => undefined },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssistantComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every `ComposerStatus`, plus attachments, the character counter and disabled. */
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-6">
      {composerStatuses.map((status) => (
        <section key={status}>
          <p className="mb-1 text-xs text-fg-muted">{status}</p>
          <AssistantComposer
            {...args}
            status={status}
            defaultValue={status === "idle" ? "" : "Summarise the holding."}
            onStop={() => undefined}
          />
        </section>
      ))}
      <section>
        <p className="mb-1 text-xs text-fg-muted">one upload settled, one in flight</p>
        <AssistantComposer
          {...args}
          attachments={composerAttachments}
          onAttachmentRemove={() => undefined}
          onAttachmentsAdd={() => undefined}
        />
      </section>
      <section>
        <p className="mb-1 text-xs text-fg-muted">near the character limit</p>
        <AssistantComposer {...args} maxLength={80} defaultValue={"x".repeat(72)} />
      </section>
      <section>
        <p className="mb-1 text-xs text-fg-muted">disabled</p>
        <AssistantComposer {...args} disabled defaultValue="Summarise the holding." />
      </section>
    </div>
  ),
};

export const Dark: Story = { ...AllStates, decorators: [darkTheme] };

/**
 * The keyboard matrix of SPEC section 5.7 with the menu open: arrows move the
 * active option instead of the caret, Enter takes the option instead of
 * submitting, Escape closes the menu and leaves the draft alone. Doubles as
 * the manual screen-reader script.
 */
export const Keyboard: Story = {
  args: { commands: slashCommands },
  parameters: commandMenuA11y,
  render: (args) => {
    /* Controlled, so the selected command really lands in the draft: the hook
       owns no text, it hands back a pure `replace` the consumer applies. */
    const [value, setValue] = React.useState("");
    return (
      <AssistantComposer
        {...args}
        value={value}
        onValueChange={setValue}
        onCommandSelect={(command, ctx) => setValue(ctx.replace(`/${command.name} `))}
      />
    );
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox");

    await step("Typing the trigger opens the menu and claims the arrow keys", async () => {
      await userEvent.click(input);
      await userEvent.keyboard("/");
      await waitFor(() => expect(input).toHaveAttribute("aria-expanded", "true"));
      const options = canvas.getAllByRole("option");
      await expect(options[0]).toHaveAttribute("aria-selected", "true");

      await userEvent.keyboard("{ArrowDown}");
      await expect(canvas.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
      /* The caret never left the input — the menu is a listbox it points at. */
      await expect(input).toHaveFocus();
      await expect(input).toHaveValue("/");
    });

    await step("Escape closes the menu without touching the draft", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(canvas.queryByRole("listbox")).toBeNull());
      await expect(input).toHaveValue("/");
    });

    await step("Typing on reopens it; Enter takes the command, not the form", async () => {
      await userEvent.keyboard("ci");
      await waitFor(() => expect(canvas.getByRole("listbox")).toBeInTheDocument());
      await userEvent.keyboard("{Enter}");
      await waitFor(() => expect(canvas.queryByRole("listbox")).toBeNull());
      await expect(input).toHaveValue("/cite ");
      await expect(input).toHaveFocus();
    });
  },
};

/** JurisGPT: commands, an upload in flight, and a token count in the footer. */
export const Realistic: Story = {
  args: {
    commands: slashCommands,
    onCommandSelect: () => undefined,
    attachments: composerAttachments,
    onAttachmentsAdd: () => undefined,
    onAttachmentRemove: () => undefined,
    accept: "application/pdf,text/csv",
    maxFiles: 4,
    maxLength: 4_000,
    defaultValue: "Compare s. 141 and s. 149 on the common-object requirement.",
    placeholder: "Ask about a provision, or type / for a command",
    footer: <span className="text-xs text-fg-subtle">28,400 / 128,000 tokens</span>,
  },
  parameters: commandMenuA11y,
};
