import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  defaultCommandFilter,
  findTrigger,
  useSlashCommands,
  type UseSlashCommandsOptions,
} from "./use-slash-commands";
import type { SlashCommand } from "../components/assistant-composer/assistant-composer.types";

const commands: SlashCommand[] = [
  { id: "cite", name: "cite", description: "Cite a section", group: "Retrieval" },
  { id: "compare", name: "compare", description: "Compare provisions", group: "Retrieval" },
  { id: "plain", name: "plain", keywords: ["simple", "eli5"], group: "Style" },
  { id: "draft", name: "draft", disabled: true },
];

describe("findTrigger", () => {
  const t = (value: string, caret = value.length, boundary = true) =>
    findTrigger(value, caret, "/", boundary);

  it("finds a token at the start of the value", () => {
    expect(t("/ci")).toEqual({ query: "ci", triggerStart: 0 });
  });

  it("finds a bare trigger with an empty query", () => {
    expect(t("/")).toEqual({ query: "", triggerStart: 0 });
  });

  it("finds a token after whitespace", () => {
    expect(t("explain /ci")).toEqual({ query: "ci", triggerStart: 8 });
  });

  it("finds a token at the start of a later line", () => {
    expect(t("first\n/ci")).toEqual({ query: "ci", triggerStart: 6 });
  });

  it("refuses a trigger glued to a word when a boundary is required", () => {
    expect(t("and/or")).toBeNull();
    expect(t("http://x")).toBeNull();
  });

  it("allows a glued trigger when the boundary is not required", () => {
    expect(t("and/or", 6, false)).toEqual({ query: "or", triggerStart: 3 });
  });

  it("closes the token once whitespace is typed", () => {
    expect(t("/cite the act")).toBeNull();
    expect(t("/cite ")).toBeNull();
  });

  it("closes the token on a newline", () => {
    expect(t("/cite\nmore")).toBeNull();
  });

  it("returns null when there is no trigger before the caret", () => {
    expect(t("plain text")).toBeNull();
  });

  it("ignores a trigger that sits after the caret", () => {
    expect(t("abc /cite", 3)).toBeNull();
  });

  it("uses the last trigger before the caret", () => {
    expect(t("/one /two")).toEqual({ query: "two", triggerStart: 5 });
  });

  it("supports a multi-character trigger", () => {
    expect(findTrigger("say ::wave", 10, "::", true)).toEqual({ query: "wave", triggerStart: 4 });
  });

  it("never opens on an empty trigger string", () => {
    expect(findTrigger("anything", 3, "", true)).toBeNull();
  });
});

describe("defaultCommandFilter", () => {
  it("returns every command for an empty query", () => {
    expect(defaultCommandFilter(commands, "")).toHaveLength(4);
  });

  it("returns a copy, not the input array", () => {
    expect(defaultCommandFilter(commands, "")).not.toBe(commands);
  });

  it("matches on a name prefix, case-insensitively", () => {
    expect(defaultCommandFilter(commands, "CI").map((c) => c.id)).toEqual(["cite"]);
  });

  it("ranks a prefix hit above a substring hit", () => {
    const ranked = defaultCommandFilter(
      [
        { id: "a", name: "recite" },
        { id: "b", name: "cite" },
      ],
      "cite"
    );
    expect(ranked.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("falls back to keywords", () => {
    expect(defaultCommandFilter(commands, "eli5").map((c) => c.id)).toEqual(["plain"]);
  });

  it("ranks a name match above a keyword match", () => {
    const ranked = defaultCommandFilter(
      [
        { id: "kw", name: "zzz", keywords: ["plain"] },
        { id: "name", name: "plain" },
      ],
      "plain"
    );
    expect(ranked.map((c) => c.id)).toEqual(["name", "kw"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(defaultCommandFilter(commands, "zzzz")).toEqual([]);
  });

  it("keeps disabled commands visible so the menu explains itself", () => {
    expect(defaultCommandFilter(commands, "draft").map((c) => c.id)).toEqual(["draft"]);
  });
});

/** A composer-free consumer: the hook's whole point is to work without one. */
function Harness(props: Partial<UseSlashCommandsOptions>): React.ReactElement {
  const [value, setValue] = React.useState("");
  const menu = useSlashCommands({
    commands,
    onSelect: (command, ctx) => setValue(ctx.replace(`/${command.name} `)),
    ...props,
  });

  const inputProps = menu.getInputProps();

  return (
    <div>
      <textarea
        aria-label="message"
        {...inputProps}
        value={value}
        onChange={(event) => {
          inputProps.onChange?.(event);
          setValue(event.currentTarget.value);
        }}
      />
      {menu.isOpen && (
        <ul {...menu.getListProps()}>
          {menu.items.map((command, index) => (
            <li key={command.id} {...menu.getItemProps(command, index)}>
              {command.name}
            </li>
          ))}
        </ul>
      )}
      <output data-testid="query">{menu.query}</output>
    </div>
  );
}

const options = () => screen.queryAllByRole("option");
const active = () => options().find((o) => o.getAttribute("aria-selected") === "true");

describe("useSlashCommands in a bare consumer", () => {
  it("opens a listbox and wires the combobox attributes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox");

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    expect(input).not.toHaveAttribute("aria-controls");

    await user.click(input);
    await user.keyboard("/");

    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toHaveAttribute("id", input.getAttribute("aria-controls"));
    expect(options()).toHaveLength(4);
  });

  it("narrows the list as the query is typed and exposes it", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("/ci");

    expect(screen.getByTestId("query")).toHaveTextContent("ci");
    expect(options().map((o) => o.textContent)).toEqual(["cite"]);
  });

  it("points aria-activedescendant at the active option", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("/");

    expect(input.getAttribute("aria-activedescendant")).toBe(active()?.id);
    await user.keyboard("{ArrowDown}");
    expect(active()?.textContent).toBe("compare");
    expect(input.getAttribute("aria-activedescendant")).toBe(active()?.id);
  });

  it("wraps ArrowDown past the end and ArrowUp past the start", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("/");

    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(active()?.textContent).toBe("cite");
    await user.keyboard("{ArrowUp}");
    expect(active()?.textContent).toBe("draft");
  });

  it("jumps to the first and last option with Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("/{End}");
    expect(active()?.textContent).toBe("draft");
    await user.keyboard("{Home}");
    expect(active()?.textContent).toBe("cite");
  });

  it("replaces only the trigger token on select, leaving the rest of the value", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "please /ci");
    await user.keyboard("{Enter}");

    expect(input).toHaveValue("please /cite ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("selects with Tab as well as Enter", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("/co{Tab}");
    expect(input).toHaveValue("/compare ");
  });

  it("hands onSelect a pure replace that does not touch the live value", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("/ci{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    const [command, ctx] = onSelect.mock.calls[0]!;
    expect(command.id).toBe("cite");
    expect(ctx).toMatchObject({ value: "/ci", query: "ci", triggerStart: 0, caret: 3 });
    expect(ctx.replace("/cite ")).toBe("/cite ");
    /* The consumer declined to apply it, so the textarea is untouched. */
    expect(input).toHaveValue("/ci");
  });

  it("refuses to select a disabled command", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("/draft{Enter}");
    expect(onSelect).not.toHaveBeenCalled();
    expect(input).toHaveValue("/draft");
  });

  it("selects on click without ever blurring the input", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("/");
    await user.click(screen.getByText("compare"));

    expect(input).toHaveValue("/compare ");
    expect(input).toHaveFocus();
  });

  it("makes the hovered option the active one", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("/");
    await user.hover(screen.getByText("plain"));
    expect(active()?.textContent).toBe("plain");
  });

  it("closes on Escape and reopens once the query changes", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("/ci");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    /* Escape dismissed the menu, never the text. */
    expect(input).toHaveValue("/ci");

    await user.keyboard("t");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes when the trigger token is deleted", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("/ci");
    await user.keyboard("{Backspace}{Backspace}{Backspace}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes on blur", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Harness />
        <button type="button">elsewhere</button>
      </>
    );
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("/");
    await user.click(screen.getByRole("button", { name: "elsewhere" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("caps the list at maxItems", async () => {
    const user = userEvent.setup();
    render(<Harness maxItems={2} />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("/");
    expect(options()).toHaveLength(2);
  });

  it("honours a custom trigger and a custom filter", async () => {
    const user = userEvent.setup();
    const filter = vi.fn((all: readonly SlashCommand[]) => [...all].reverse());
    render(<Harness trigger="::" filter={filter} />);
    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("/nothing");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.clear(input);
    await user.keyboard("::");
    expect(options()[0]).toHaveTextContent("draft");
  });

  it("marks a disabled option aria-disabled and leaves the rest alone", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("combobox"));
    await user.keyboard("/");
    expect(screen.getByText("draft")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("cite")).not.toHaveAttribute("aria-disabled");
  });
});
