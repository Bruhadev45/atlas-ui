import * as React from "react";
import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { ToolCallTimeline } from "./tool-call-timeline";
import type { ToolCall } from "./tool-call-timeline.types";
/* The fixture is shared with the stories so the two can never drift (SPEC 7). */
import { toolCalls as calls } from "../../stories/fixtures";

/* The component fixture is not a page, so the landmark rule does not apply. */
const axeOptions = { rules: { region: { enabled: false } } };

/*
 * The accessible-name algorithm joins element children with a space, so the
 * sr-only status suffix computes as "hybrid_retrieve , Succeeded". Speech
 * output is unaffected; normalise the seam so the assertions stay readable.
 */
function row(pattern: RegExp): HTMLElement {
  return screen.getByRole("button", { name: (name: string) => pattern.test(name.replace(" ,", ",")) });
}

describe("ToolCallTimeline structure", () => {
  it("renders an ordered list with one row per top-level call", () => {
    render(<ToolCallTimeline calls={calls} />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("puts the status and the spelled-out duration in each row's accessible name", () => {
    render(<ToolCallTimeline calls={calls} />);
    expect(row(/^classify_query, Succeeded, 120 milliseconds$/)).toBeInTheDocument();
    expect(row(/^hybrid_retrieve, Succeeded, 1.4 seconds$/)).toBeInTheDocument();
  });

  it("renders the abbreviated duration for sighted readers, hidden from AT", () => {
    render(<ToolCallTimeline calls={calls} />);
    expect(screen.getByText("120ms")).toHaveAttribute("aria-hidden", "true");
  });

  it("drops durations entirely with showDurations={false}", () => {
    render(<ToolCallTimeline calls={calls} showDurations={false} />);
    expect(screen.queryByText("120ms")).not.toBeInTheDocument();
    expect(row(/^classify_query, Succeeded$/)).toBeInTheDocument();
  });

  it("marks running rows aria-busy", () => {
    render(<ToolCallTimeline calls={[{ id: "r", name: "search", status: "running" }]} />);
    expect(screen.getByRole("listitem")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("listitem")).toHaveAttribute("data-status", "running");
  });

  it("renders a call with nothing to disclose and nothing to select as plain text", () => {
    render(<ToolCallTimeline calls={calls} />);
    expect(screen.queryByRole("button", { name: /draft_answer/ })).not.toBeInTheDocument();
    expect(screen.getByText("draft_answer")).toBeInTheDocument();
  });

  it("renders the empty state in a paragraph, not an empty list", () => {
    render(<ToolCallTimeline calls={[]} />);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("No tool calls")).toBeInTheDocument();
  });

  it("accepts a custom empty state and custom labels", () => {
    const { rerender } = render(<ToolCallTimeline calls={[]} emptyState={<p>Nothing ran</p>} />);
    expect(screen.getByText("Nothing ran")).toBeInTheDocument();

    rerender(
      <ToolCallTimeline
        calls={calls}
        labels={{ args: "Eingaben", statuses: { ok: "Erfolgreich" } as never }}
      />
    );
    expect(row(/^classify_query, Erfolgreich, 120 milliseconds$/)).toBeInTheDocument();
  });
});

describe("ToolCallTimeline expansion", () => {
  it("expands and collapses a nested call, mounting children only when open", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} />);

    const trigger = row(/^hybrid_retrieve/);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("bm25_search")).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(row(/^bm25_search, Succeeded, 61 milliseconds$/)).toBeInTheDocument();

    await user.click(row(/^dense_search, Failed/));
    expect(screen.getByText("embedding service timed out")).toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("bm25_search")).not.toBeInTheDocument();
  });

  it("labels the panel with its own row", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} />);
    const trigger = row(/^hybrid_retrieve/);
    await user.click(trigger);

    const panel = screen.getByRole("group", { name: /^hybrid_retrieve/ });
    expect(trigger).toHaveAttribute("aria-controls", panel.id);
  });

  it("honours defaultExpandedIds and defaultExpandAll", () => {
    const { unmount } = render(<ToolCallTimeline calls={calls} defaultExpandedIds={["t2"]} />);
    expect(screen.getByText("bm25_search")).toBeInTheDocument();
    unmount();

    render(<ToolCallTimeline calls={calls} defaultExpandAll />);
    expect(row(/^hybrid_retrieve/)).toHaveAttribute("aria-expanded", "true");
    expect(row(/^bm25_search/)).toHaveAttribute("aria-expanded", "true");
  });

  it("stays put in controlled mode until the consumer echoes the change", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <ToolCallTimeline calls={calls} expandedIds={[]} onExpandedChange={onExpandedChange} />
    );

    await user.click(row(/^hybrid_retrieve/));
    expect(onExpandedChange).toHaveBeenCalledWith(["t2"]);
    expect(screen.queryByText("bm25_search")).not.toBeInTheDocument();

    rerender(
      <ToolCallTimeline calls={calls} expandedIds={["t2"]} onExpandedChange={onExpandedChange} />
    );
    expect(screen.getByText("bm25_search")).toBeInTheDocument();
  });

  it("auto-expands a call that enters running, and reports it to a controlled consumer", () => {
    const idle: ToolCall[] = [{ id: "t2", name: "hybrid_retrieve", status: "pending", args: {} }];
    const running: ToolCall[] = [{ ...idle[0]!, status: "running" }];

    const { rerender, unmount } = render(<ToolCallTimeline calls={idle} />);
    expect(row(/^hybrid_retrieve/)).toHaveAttribute("aria-expanded", "false");
    rerender(<ToolCallTimeline calls={running} />);
    expect(row(/^hybrid_retrieve/)).toHaveAttribute("aria-expanded", "true");
    unmount();

    const onExpandedChange = vi.fn();
    const controlled = render(
      <ToolCallTimeline calls={idle} expandedIds={[]} onExpandedChange={onExpandedChange} />
    );
    controlled.rerender(
      <ToolCallTimeline calls={running} expandedIds={[]} onExpandedChange={onExpandedChange} />
    );
    expect(onExpandedChange).toHaveBeenCalledWith(["t2"]);
    expect(row(/^hybrid_retrieve/)).toHaveAttribute("aria-expanded", "false");
  });

  it("leaves running calls collapsed with autoExpandRunning={false}", () => {
    const idle: ToolCall[] = [{ id: "t2", name: "hybrid_retrieve", status: "pending", args: {} }];
    const { rerender } = render(<ToolCallTimeline calls={idle} autoExpandRunning={false} />);
    rerender(
      <ToolCallTimeline calls={[{ ...idle[0]!, status: "running" }]} autoExpandRunning={false} />
    );
    expect(row(/^hybrid_retrieve/)).toHaveAttribute("aria-expanded", "false");
  });
});

describe("ToolCallTimeline serialisation", () => {
  it("redacts credential-shaped keys by default", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} />);
    await user.click(row(/^classify_query/));

    const panel = screen.getByRole("group", { name: /^classify_query/ });
    expect(panel).toHaveTextContent('"apiKey": "[redacted]"');
    expect(panel).not.toHaveTextContent("sk-live-secret");
    expect(panel).toHaveTextContent('"intent": "statute_lookup"');
  });

  it("widens the default list rather than replacing it", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallTimeline
        calls={[{ id: "a", name: "lookup_employee", status: "ok", args: { ssn: "111-22-3333", apiKey: "sk-live-secret" } }]}
        redactKeys={["ssn"]}
      />
    );
    await user.click(row(/^lookup_employee/));

    const panel = screen.getByRole("group", { name: /^lookup_employee/ });
    expect(panel).not.toHaveTextContent("111-22-3333");
    expect(panel).not.toHaveTextContent("sk-live-secret");
  });

  it("treats an explicitly empty redactKeys as the opt-out", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} redactKeys={[]} />);
    await user.click(row(/^classify_query/));
    expect(screen.getByRole("group", { name: /^classify_query/ })).toHaveTextContent("sk-live-secret");
  });

  it("truncates past maxSerializedChars behind a show-more control", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallTimeline
        calls={[{ id: "a", name: "fetch", status: "ok", args: { note: "x".repeat(500) } }]}
        maxSerializedChars={40}
      />
    );
    await user.click(row(/^fetch/));

    const panel = screen.getByRole("group", { name: /^fetch/ });
    expect(panel.textContent).toContain("…");
    expect(panel.querySelector("pre")!.textContent!.length).toBeLessThan(60);

    await user.click(screen.getByRole("button", { name: "Show the full value" }));
    expect(panel.querySelector("pre")!.textContent).toContain("x".repeat(500));
    expect(screen.queryByRole("button", { name: "Show the full value" })).not.toBeInTheDocument();
  });

  it("keeps the serialised block keyboard-reachable, because it scrolls", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} />);
    await user.click(row(/^classify_query/));
    for (const pre of screen.getByRole("group", { name: /^classify_query/ }).querySelectorAll("pre")) {
      expect(pre).toHaveAttribute("tabindex", "0");
    }
  });

  it("falls back to the default renderer when a custom one returns undefined", async () => {
    const user = userEvent.setup();
    render(
      <ToolCallTimeline
        calls={calls}
        renderResult={(call) => (call.name === "classify_query" ? <p>statute lookup</p> : undefined)}
      />
    );
    await user.click(row(/^classify_query/));
    expect(screen.getByText("statute lookup")).toBeInTheDocument();

    await user.click(row(/^hybrid_retrieve/));
    expect(screen.getByRole("group", { name: /^hybrid_retrieve/ })).toHaveTextContent('"top_k": 8');
  });
});

describe("ToolCallTimeline depth", () => {
  const deep: ToolCall[] = [
    {
      id: "d1",
      name: "level_1",
      status: "ok",
      children: [
        {
          id: "d2",
          name: "level_2",
          status: "ok",
          children: [{ id: "d3", name: "level_3", status: "ok", children: [{ id: "d4", name: "level_4", status: "ok" }] }],
        },
      ],
    },
  ];

  it("folds calls past maxDepth into a count that raises the depth when activated", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={deep} maxDepth={2} defaultExpandAll />);

    expect(screen.getByText("level_2")).toBeInTheDocument();
    expect(screen.queryByText("level_3")).not.toBeInTheDocument();

    const fold = screen.getByRole("button", { name: "2 more nested calls" });
    await user.click(fold);

    expect(screen.getByText("level_3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 more nested calls" })).toBeInTheDocument();
  });
});

describe("ToolCallTimeline selection", () => {
  it("reports the activated call and marks the selected row", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ToolCallTimeline calls={calls} selectedId="t1" onSelect={onSelect} />);

    expect(row(/^classify_query/)).toHaveAttribute("aria-current", "true");
    expect(row(/^hybrid_retrieve/)).not.toHaveAttribute("aria-current");

    await user.click(row(/^hybrid_retrieve/));
    expect(onSelect).toHaveBeenCalledWith(calls[1]);
  });

  it("makes an otherwise inert call selectable when onSelect is given", () => {
    render(<ToolCallTimeline calls={calls} onSelect={vi.fn()} />);
    const trigger = row(/^draft_answer, Pending$/);
    expect(trigger).not.toHaveAttribute("aria-expanded");
  });
});

describe("ToolCallTimeline keyboard", () => {
  it("toggles with Enter and Space and returns focus nowhere else", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} />);

    const trigger = row(/^hybrid_retrieve/);
    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("expands with ArrowRight, then steps into the first child", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} />);

    const trigger = row(/^hybrid_retrieve/);
    trigger.focus();
    await user.keyboard("{ArrowRight}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{ArrowRight}");
    expect(row(/^bm25_search/)).toHaveFocus();
  });

  it("collapses with ArrowLeft, then steps out to the parent", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} defaultExpandAll />);

    const child = row(/^bm25_search/);
    child.focus();
    await user.keyboard("{ArrowLeft}");
    expect(child).toHaveAttribute("aria-expanded", "false");

    await user.keyboard("{ArrowLeft}");
    expect(row(/^hybrid_retrieve/)).toHaveFocus();
  });

  it("jumps to the first and last visible row with Home and End", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} defaultExpandedIds={["t2"]} />);

    row(/^hybrid_retrieve/).focus();
    await user.keyboard("{End}");
    expect(row(/^dense_search/)).toHaveFocus();

    await user.keyboard("{Home}");
    expect(row(/^classify_query/)).toHaveFocus();
  });

  it("moves through rows with Tab, without a roving tabindex", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} />);

    await user.tab();
    expect(row(/^classify_query/)).toHaveFocus();
    await user.tab();
    expect(row(/^hybrid_retrieve/)).toHaveFocus();
  });

  it("leaves arrow keys alone inside a panel, so text selection still works", async () => {
    const user = userEvent.setup();
    render(<ToolCallTimeline calls={calls} />);
    await user.click(row(/^hybrid_retrieve/));

    const pre = screen.getByRole("group", { name: /^hybrid_retrieve/ }).querySelector("pre")!;
    const event = createEvent.keyDown(pre, { key: "ArrowLeft" });
    fireEvent(pre, event);

    expect(event.defaultPrevented).toBe(false);
    expect(row(/^hybrid_retrieve/)).toHaveAttribute("aria-expanded", "true");
  });

  it("still calls a consumer's own onKeyDown", async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<ToolCallTimeline calls={calls} onKeyDown={onKeyDown} />);

    row(/^hybrid_retrieve/).focus();
    await user.keyboard("{Home}");
    expect(onKeyDown).toHaveBeenCalled();
  });
});

describe("ToolCallTimeline announcements", () => {
  const idle: ToolCall[] = [{ id: "t1", name: "hybrid_retrieve", status: "pending" }];
  const done: ToolCall[] = [{ id: "t1", name: "hybrid_retrieve", status: "ok", durationMs: 10 }];

  it("is silent by default", () => {
    const { rerender } = render(<ToolCallTimeline calls={idle} />);
    rerender(<ToolCallTimeline calls={done} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("announces transitions, but not the calls it mounted with", () => {
    const { rerender } = render(<ToolCallTimeline calls={idle} announceStatusChanges />);
    expect(screen.getByRole("status")).toHaveTextContent("");

    rerender(<ToolCallTimeline calls={done} announceStatusChanges />);
    expect(screen.getByRole("status")).toHaveTextContent("hybrid_retrieve: Succeeded");
  });
});

describe("ToolCallTimeline accessibility", () => {
  it("has no axe violations when collapsed", async () => {
    const { container } = render(<ToolCallTimeline calls={calls} />);
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it("has no axe violations with nested rows expanded and one selected", async () => {
    const { container } = render(
      <ToolCallTimeline calls={calls} defaultExpandAll selectedId="t2" onSelect={vi.fn()} announceStatusChanges />
    );
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it("has no axe violations when empty", async () => {
    const { container } = render(<ToolCallTimeline calls={[]} />);
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });
});
