import * as React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { AssistantComposer } from "./assistant-composer";
/* The fixture is shared with the stories so the two can never drift (SPEC 7). */
import {
  composerAttachments as attachments,
  slashCommands as commands,
} from "../../stories/fixtures";

/* The component fixture is not a page, so the landmark rule does not apply. */
const axeOptions = { rules: { region: { enabled: false } } };

function file(name: string, type = "application/pdf", bytes = 4): File {
  return new File(["x".repeat(bytes)], name, { type });
}

/*
 * jsdom ships no DataTransfer, and user-event's `paste` reads `getData` off
 * whatever it is handed. A literal with the fields the component touches is
 * enough, dispatched through fireEvent so user-event's clipboard plumbing stays
 * out of the way.
 */
function transfer(files: readonly File[]) {
  return { files, items: [], types: ["Files"], getData: () => "" };
}

/** The drop target is the shell that wraps the textarea. */
const shell = () => input().parentElement as HTMLElement;

const input = () => screen.getByRole("textbox");
const combobox = () => screen.getByRole("combobox");
const sendButton = () => screen.getByRole("button", { name: "Send message" });

/** The composer with the minimum required props, plus whatever the test needs. */
function setup(props: Partial<React.ComponentProps<typeof AssistantComposer>> = {}) {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  const utils = render(<AssistantComposer onSubmit={onSubmit} {...props} />);
  return { onSubmit, user, ...utils };
}

describe("AssistantComposer structure", () => {
  it("is a form whose send control is a real submit button", () => {
    const { container } = setup();
    expect(container.querySelector("form")).toBeInTheDocument();
    expect(sendButton()).toHaveAttribute("type", "submit");
  });

  it("labels the textarea rather than relying on the placeholder", () => {
    setup();
    expect(input()).toHaveAccessibleName("Send a message");
  });

  it("lets a consumer supply a visible label instead", () => {
    setup({ textareaProps: { "aria-labelledby": "visible" } });
    expect(input()).not.toHaveAttribute("aria-label");
    expect(input()).toHaveAttribute("aria-labelledby", "visible");
  });

  it("keeps the native textarea role when no commands are supplied", () => {
    setup();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(input()).not.toHaveAttribute("aria-expanded");
  });

  it("renders no attach button and no file input when attachments are omitted", () => {
    const { container } = setup();
    expect(screen.queryByRole("button", { name: "Attach files" })).not.toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });

  it("forwards its ref to the form and inputRef to the textarea", () => {
    const formRef = React.createRef<HTMLFormElement>();
    const textRef = React.createRef<HTMLTextAreaElement>();
    render(<AssistantComposer onSubmit={vi.fn()} ref={formRef} inputRef={textRef} />);
    expect(formRef.current?.tagName).toBe("FORM");
    expect(textRef.current?.tagName).toBe("TEXTAREA");
  });

  it("renders the toolbar and footer slots", () => {
    setup({ toolbar: <span>toolbar slot</span>, footer: <span>footer slot</span> });
    expect(screen.getByText("toolbar slot")).toBeInTheDocument();
    expect(screen.getByText("footer slot")).toBeInTheDocument();
  });
});

describe("AssistantComposer text state", () => {
  it("types uncontrolled from defaultValue and reports through onValueChange", async () => {
    const onValueChange = vi.fn();
    const { user } = setup({ defaultValue: "draft", onValueChange });
    await user.type(input(), "!");
    expect(input()).toHaveValue("draft!");
    expect(onValueChange).toHaveBeenLastCalledWith("draft!");
  });

  it("obeys a controlled value that refuses the change", async () => {
    const { user } = setup({ value: "fixed", onValueChange: vi.fn() });
    await user.type(input(), "more");
    expect(input()).toHaveValue("fixed");
  });

  it("enforces maxLength and counts down", async () => {
    const { user } = setup({ maxLength: 10 });
    await user.type(input(), "abcdefghijkl");
    expect(input()).toHaveValue("abcdefghij");
    expect(input()).toHaveAccessibleDescription("0 characters remaining");
  });

  it("announces the budget once when crossing 90% of maxLength", async () => {
    const { user } = setup({ maxLength: 10 });
    const region = screen.getByRole("status");
    expect(region).toHaveTextContent("");

    await user.type(input(), "abcdefghi");
    expect(region).toHaveTextContent("1 characters remaining");

    /* Still inside the warning band: it must not re-announce per keystroke. */
    await user.type(input(), "j");
    expect(region).toHaveTextContent("1 characters remaining");
  });
});

describe("AssistantComposer submit", () => {
  it("submits the text and the attachments together", async () => {
    const { user, onSubmit } = setup({ attachments, onAttachmentRemove: vi.fn() });
    await user.type(input(), "summarise this");
    await user.click(sendButton());
    expect(onSubmit).toHaveBeenCalledWith({ text: "summarise this", attachments });
  });

  it("clears the text only after the submit promise resolves", async () => {
    let release: () => void = () => {};
    const onSubmit = vi.fn(() => new Promise<void>((resolve) => (release = resolve)));
    const user = userEvent.setup();
    render(<AssistantComposer onSubmit={onSubmit} />);

    await user.type(input(), "hello");
    await user.click(sendButton());
    expect(input()).toHaveValue("hello");

    release();
    await waitFor(() => expect(input()).toHaveValue(""));
  });

  it("keeps the draft when clearOnSubmit is false", async () => {
    const { user } = setup({ clearOnSubmit: false });
    await user.type(input(), "keep me");
    await user.click(sendButton());
    await waitFor(() => expect(input()).toHaveValue("keep me"));
  });

  it("disables send for an empty or whitespace-only draft", async () => {
    const { user } = setup();
    expect(sendButton()).toBeDisabled();
    await user.type(input(), "   ");
    expect(sendButton()).toBeDisabled();
    await user.type(input(), "x");
    expect(sendButton()).toBeEnabled();
  });

  it("allows an attachment-only submit", () => {
    setup({ attachments, onAttachmentRemove: vi.fn() });
    expect(sendButton()).toBeEnabled();
  });

  it("does not submit while already submitting", async () => {
    const { user, onSubmit } = setup({ defaultValue: "hi", status: "submitting" });
    expect(sendButton()).toBeDisabled();
    await user.type(input(), "{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("swaps send for stop while streaming, as two separate buttons", async () => {
    const onStop = vi.fn();
    const { user } = setup({ defaultValue: "hi", status: "streaming", onStop });
    const stop = screen.getByRole("button", { name: "Stop generating" });
    expect(sendButton()).toBeDisabled();
    await user.click(stop);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("leaves the textarea editable while streaming", async () => {
    const { user } = setup({ status: "streaming", onStop: vi.fn() });
    await user.type(input(), "next turn");
    expect(input()).toHaveValue("next turn");
  });
});

describe("AssistantComposer keyboard matrix, menu closed", () => {
  it("Enter submits and Shift+Enter inserts a newline (submitOn='enter')", async () => {
    const { user, onSubmit } = setup({ clearOnSubmit: false });
    await user.type(input(), "one");
    await user.keyboard("{Shift>}{Enter}{/Shift}");
    await user.type(input(), "two");
    expect(input()).toHaveValue("one\ntwo");
    expect(onSubmit).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith({ text: "one\ntwo", attachments: [] });
  });

  it("Enter inserts a newline and does not submit (submitOn='mod-enter')", async () => {
    const { user, onSubmit } = setup({ submitOn: "mod-enter", clearOnSubmit: false });
    await user.type(input(), "one{Enter}two");
    expect(input()).toHaveValue("one\ntwo");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("Cmd/Ctrl+Enter submits in both modes", async () => {
    for (const submitOn of ["enter", "mod-enter"] as const) {
      const { user, onSubmit, unmount } = setup({ submitOn, clearOnSubmit: false });
      await user.type(input(), "go");
      await user.keyboard("{Control>}{Enter}{/Control}");
      expect(onSubmit).toHaveBeenCalledTimes(1);

      await user.keyboard("{Meta>}{Enter}{/Meta}");
      expect(onSubmit).toHaveBeenCalledTimes(2);
      unmount();
    }
  });

  it("Escape never clears the draft and never stops the stream", async () => {
    const onStop = vi.fn();
    const { user, onSubmit } = setup({ defaultValue: "precious", status: "streaming", onStop });
    input().focus();
    await user.keyboard("{Escape}");
    expect(input()).toHaveValue("precious");
    expect(onStop).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls a consumer's own onKeyDown and honours its preventDefault", async () => {
    const onKeyDown = vi.fn((event: React.KeyboardEvent) => event.preventDefault());
    const { user, onSubmit } = setup({ defaultValue: "hi", textareaProps: { onKeyDown } });
    input().focus();
    await user.keyboard("{Enter}");
    expect(onKeyDown).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("AssistantComposer keyboard matrix, menu open", () => {
  const openMenu = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(combobox());
    await user.keyboard("/");
  };

  it("Enter selects the active command instead of submitting", async () => {
    const onCommandSelect = vi.fn();
    const { user, onSubmit } = setup({ commands, onCommandSelect });
    await openMenu(user);
    await user.keyboard("{Enter}");

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCommandSelect).toHaveBeenCalledTimes(1);
    expect(onCommandSelect.mock.calls[0]![0].id).toBe("cite");
  });

  it("leaves the text alone when the consumer discards the replacement", async () => {
    const { user } = setup({
      commands,
      onCommandSelect: (command, ctx) => ctx.replace(`/${command.name} `),
    });
    await openMenu(user);
    await user.keyboard("com{Enter}");
    /* `replace` is pure and its result was thrown away, so nothing changed:
       the hook never writes to the textarea on the consumer's behalf. */
    expect(combobox()).toHaveValue("/com");
  });

  it("drives a controlled value through onCommandSelect", async () => {
    function Controlled(): React.ReactElement {
      const [value, setValue] = React.useState("");
      return (
        <AssistantComposer
          value={value}
          onValueChange={setValue}
          onSubmit={vi.fn()}
          commands={commands}
          onCommandSelect={(command, ctx) => setValue(ctx.replace(`/${command.name} `))}
        />
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(combobox());
    await user.keyboard("explain /pl{Enter}");
    expect(combobox()).toHaveValue("explain /plain ");
  });

  it("Escape closes the menu only, leaving the text and the stream alone", async () => {
    const { user, onSubmit } = setup({ commands, onCommandSelect: vi.fn() });
    await openMenu(user);
    await user.keyboard("ci");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(combobox()).toHaveValue("/ci");

    /* Enter now submits again, because the menu is gone. */
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("Arrow keys move the active option and never move the caret out", async () => {
    const { user } = setup({ commands, onCommandSelect: vi.fn() });
    await openMenu(user);
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    expect(combobox()).toHaveValue("/");
  });

  it("shows the empty message and still lets Enter submit with no matches", async () => {
    const { user, onSubmit } = setup({ commands, onCommandSelect: vi.fn(), clearOnSubmit: false });
    await openMenu(user);
    await user.keyboard("zzz");

    expect(screen.getByText("No matching commands")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);

    /* A user who typed a non-command must not be trapped unable to send. */
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith({ text: "/zzz", attachments: [] });
  });

  it("groups options under their group headings", async () => {
    const { user } = setup({ commands, onCommandSelect: vi.fn() });
    await openMenu(user);
    const list = screen.getByRole("listbox");
    expect(within(list).getByText("Retrieval")).toBeInTheDocument();
    expect(within(list).getByText("Style")).toBeInTheDocument();
  });

  it("uses renderCommandItem for the option content", async () => {
    const { user } = setup({
      commands,
      onCommandSelect: vi.fn(),
      renderCommandItem: (command, state) => <span>{`${command.name}:${state.index}`}</span>,
    });
    await openMenu(user);
    expect(screen.getByText("cite:0")).toBeInTheDocument();
    expect(screen.queryByText("Cite a specific section")).not.toBeInTheDocument();
  });

  it("honours a custom commandTrigger", async () => {
    const { user } = setup({ commands, commandTrigger: "@", onCommandSelect: vi.fn() });
    await user.click(combobox());
    await user.keyboard("/");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.keyboard(" @");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });
});

describe("AssistantComposer attachments", () => {
  const withAttachments = (props = {}) =>
    setup({ attachments, onAttachmentRemove: vi.fn(), onAttachmentsAdd: vi.fn(), ...props });

  it("renders one removable chip per attachment", () => {
    withAttachments();
    expect(screen.getByText("filing.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove filing.pdf" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove rows.csv" })).toBeInTheDocument();
  });

  it("exposes upload progress as a progressbar", () => {
    withAttachments();
    const bar = screen.getByRole("progressbar", { name: "rows.csv" });
    expect(bar).toHaveAttribute("aria-valuenow", "40");
  });

  it("renders an error as text, not only as colour", () => {
    setup({
      attachments: [{ id: "e", name: "bad.pdf", status: "error", error: "Upload failed" }],
      onAttachmentRemove: vi.fn(),
    });
    expect(screen.getByText("Upload failed")).toBeInTheDocument();
  });

  it("removes an attachment through the chip button", async () => {
    const onAttachmentRemove = vi.fn();
    const { user } = withAttachments({ onAttachmentRemove });
    await user.click(screen.getByRole("button", { name: "Remove filing.pdf" }));
    expect(onAttachmentRemove).toHaveBeenCalledWith("a1");
  });

  it("always renders a file input behind a visible, focusable attach button", () => {
    const { container } = withAttachments();
    const fileInput = container.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Attach files" })).toBeEnabled();
  });

  it("puts accept on the file input and passes picked files through", async () => {
    const onAttachmentsAdd = vi.fn();
    const { user, container } = withAttachments({
      onAttachmentsAdd,
      accept: "application/pdf",
      attachments: [],
    });

    /* The picker itself filters on `accept`, in the browser and in user-event,
       so the "type" rejection path is exercised through paste and drop below. */
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toHaveAttribute("accept", "application/pdf");
    expect(fileInput).toHaveAttribute("multiple");

    const good = file("ok.pdf");
    await user.upload(fileInput, [good]);
    expect(onAttachmentsAdd).toHaveBeenCalledWith([good]);
  });

  it("rejects an oversize picked file before the consumer sees it", async () => {
    const onAttachmentsAdd = vi.fn();
    const onFileRejected = vi.fn();
    const { user, container } = withAttachments({
      onAttachmentsAdd,
      onFileRejected,
      maxFileSize: 10,
      attachments: [],
    });

    const big = file("big.pdf", "application/pdf", 50);
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, [big]);
    expect(onFileRejected).toHaveBeenCalledWith(big, "size");
    expect(onAttachmentsAdd).not.toHaveBeenCalled();
  });

  it("counts the attachments already held against maxFiles", async () => {
    const onAttachmentsAdd = vi.fn();
    const onFileRejected = vi.fn();
    const { user, container } = withAttachments({ onAttachmentsAdd, onFileRejected, maxFiles: 2 });
    const extra = file("third.pdf");
    await user.upload(container.querySelector('input[type="file"]') as HTMLInputElement, [extra]);

    expect(onAttachmentsAdd).not.toHaveBeenCalled();
    expect(onFileRejected).toHaveBeenCalledWith(extra, "count");
  });

  it("attaches pasted files through the same validation path", () => {
    const onAttachmentsAdd = vi.fn();
    const onFileRejected = vi.fn();
    withAttachments({ onAttachmentsAdd, onFileRejected, attachments: [], accept: ".pdf" });

    const shot = file("shot.png", "image/png");
    const doc = file("brief.pdf");
    fireEvent.paste(input(), { clipboardData: transfer([doc, shot]) });

    expect(onAttachmentsAdd).toHaveBeenCalledWith([doc]);
    expect(onFileRejected).toHaveBeenCalledWith(shot, "type");
  });

  it("ignores pasted files when allowPaste is false", () => {
    const onAttachmentsAdd = vi.fn();
    withAttachments({ onAttachmentsAdd, attachments: [], allowPaste: false });
    fireEvent.paste(input(), { clipboardData: transfer([file("a.pdf")]) });
    expect(onAttachmentsAdd).not.toHaveBeenCalled();
  });

  it("shows a drop affordance while a file is dragged over, and attaches on drop", () => {
    const onAttachmentsAdd = vi.fn();
    withAttachments({ onAttachmentsAdd, attachments: [] });

    const dropped = file("dragged.pdf");
    fireEvent.dragEnter(shell(), { dataTransfer: transfer([dropped]) });
    expect(shell()).toHaveAttribute("data-drag-active");
    expect(screen.getByText("Drop files to attach")).toBeInTheDocument();

    fireEvent.drop(shell(), { dataTransfer: transfer([dropped]) });
    expect(onAttachmentsAdd).toHaveBeenCalledWith([dropped]);
    expect(shell()).not.toHaveAttribute("data-drag-active");
  });

  it("clears the drop affordance when the drag leaves again", () => {
    withAttachments({ attachments: [] });
    fireEvent.dragEnter(shell(), { dataTransfer: transfer([file("a.pdf")]) });
    fireEvent.dragLeave(shell(), { dataTransfer: transfer([file("a.pdf")]) });
    expect(shell()).not.toHaveAttribute("data-drag-active");
  });

  it("ignores drops when allowDrop is false", () => {
    const onAttachmentsAdd = vi.fn();
    withAttachments({ onAttachmentsAdd, attachments: [], allowDrop: false });
    fireEvent.dragEnter(shell(), { dataTransfer: transfer([file("a.pdf")]) });
    expect(shell()).not.toHaveAttribute("data-drag-active");
    fireEvent.drop(shell(), { dataTransfer: transfer([file("a.pdf")]) });
    expect(onAttachmentsAdd).not.toHaveBeenCalled();
  });

  it("Backspace removes the last attachment only when the draft is empty", async () => {
    const onAttachmentRemove = vi.fn();
    const { user } = withAttachments({ onAttachmentRemove });

    await user.type(input(), "text");
    await user.keyboard("{Backspace}");
    expect(onAttachmentRemove).not.toHaveBeenCalled();
    expect(input()).toHaveValue("tex");

    await user.clear(input());
    await user.keyboard("{Backspace}");
    expect(onAttachmentRemove).toHaveBeenCalledWith("a2");
  });

  it("leaves attachments alone when backspaceRemovesLastAttachment is false", async () => {
    const onAttachmentRemove = vi.fn();
    const { user } = withAttachments({
      onAttachmentRemove,
      backspaceRemovesLastAttachment: false,
    });
    input().focus();
    await user.keyboard("{Backspace}");
    expect(onAttachmentRemove).not.toHaveBeenCalled();
  });
});

describe("AssistantComposer accessibility", () => {
  it("has no axe violations in its minimal form", async () => {
    const { container } = setup();
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it("has no axe violations with attachments, a counter and a footer", async () => {
    const { container } = setup({
      attachments,
      onAttachmentRemove: vi.fn(),
      maxLength: 400,
      defaultValue: "draft",
      footer: <span>footer</span>,
      status: "streaming",
      onStop: vi.fn(),
    });
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  /*
   * `aria-allowed-role` is off for this one assertion, and only this one:
   * role="combobox" on a <textarea> overrides the native role, which axe flags
   * categorically. SPEC section 5.7 takes that trade knowingly — it is the
   * pattern production chat inputs use for a multi-line editor with a command
   * menu — and puts the combination on the manual NVDA/VoiceOver checklist
   * (section 8.3) instead. Every other rule stays on.
   */
  it("has no axe violations with the command menu open", async () => {
    const { container, user } = setup({ commands, onCommandSelect: vi.fn() });
    await user.click(combobox());
    await user.keyboard("/");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(
      await axe(container, {
        rules: { ...axeOptions.rules, "aria-allowed-role": { enabled: false } },
      })
    ).toHaveNoViolations();
  });

  it("disables every control when disabled", () => {
    setup({ attachments, onAttachmentRemove: vi.fn(), defaultValue: "hi", disabled: true });
    expect(input()).toBeDisabled();
    expect(sendButton()).toBeDisabled();
    expect(screen.getByRole("button", { name: "Attach files" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove filing.pdf" })).toBeDisabled();
  });
});
