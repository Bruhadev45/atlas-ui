import * as React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StreamingMessage } from "./streaming-message";

/* The component fixture is not a page, so the landmark rule does not apply. */
const axeOptions = { rules: { region: { enabled: false } } };

function liveRegion(container: HTMLElement): HTMLElement {
  const region = container.querySelector<HTMLElement>('[aria-live="polite"]');
  if (!region) throw new Error("no live region rendered");
  return region;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("StreamingMessage rendering", () => {
  it("renders the content as text and exposes the status on the root", () => {
    const { container } = render(<StreamingMessage content="Appeal allowed." status="complete" />);
    expect(screen.getByText("Appeal allowed.")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("data-status", "complete");
    expect(container.firstElementChild).toHaveAttribute("aria-busy", "false");
  });

  it("marks the message busy while streaming and claims no role", () => {
    const { container } = render(<StreamingMessage content="Appeal" status="streaming" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).toHaveAttribute("data-status", "streaming");
    expect(root).not.toHaveAttribute("role");
  });

  it("shows the caret only while streaming, hidden from assistive tech", () => {
    const { container, rerender } = render(
      <StreamingMessage content="Appeal" status="streaming" />
    );
    const caret = container.querySelector("[data-atlas-cursor]");
    expect(caret).toHaveAttribute("aria-hidden", "true");
    expect(caret).toHaveClass("atlas-cursor");

    rerender(<StreamingMessage content="Appeal allowed." status="complete" />);
    expect(container.querySelector("[data-atlas-cursor]")).toBeNull();
  });

  it("drops the caret entirely with cursor={false} and accepts a custom node", () => {
    const { container, rerender } = render(
      <StreamingMessage content="Appeal" status="streaming" cursor={false} />
    );
    expect(container.querySelector("[data-atlas-cursor]")).toBeNull();

    rerender(<StreamingMessage content="Appeal" status="streaming" cursor={<i>▌</i>} />);
    expect(container.querySelector("[data-atlas-cursor] i")).toHaveTextContent("▌");
  });

  it("repairs half-written markdown before handing it to renderContent", () => {
    const renderContent = vi.fn(() => <p>rendered</p>);
    render(
      <StreamingMessage content="the *ratio" status="streaming" renderContent={renderContent} />
    );
    expect(renderContent).toHaveBeenCalledWith("the *ratio*", {
      status: "streaming",
      isPartial: true,
    });
  });

  it("passes the raw text through with repairPartialMarkdown={false}", () => {
    const renderContent = vi.fn(() => <p>rendered</p>);
    render(
      <StreamingMessage
        content="the *ratio"
        status="streaming"
        repairPartialMarkdown={false}
        renderContent={renderContent}
      />
    );
    expect(renderContent).toHaveBeenCalledWith("the *ratio", {
      status: "streaming",
      isPartial: true,
    });
  });

  it("reports isPartial false once the stream has finished", () => {
    const renderContent = vi.fn(() => <p>rendered</p>);
    render(<StreamingMessage content="done" status="complete" renderContent={renderContent} />);
    expect(renderContent).toHaveBeenCalledWith("done", { status: "complete", isPartial: false });
  });

  it("replaces the content with the error node on status=error", () => {
    render(
      <StreamingMessage
        content="partial answer"
        status="error"
        error={<>Could not reach the knowledge base.</>}
      />
    );
    expect(screen.getByText("Could not reach the knowledge base.")).toBeInTheDocument();
    expect(screen.queryByText("partial answer")).not.toBeInTheDocument();
  });

  it("keeps the partial content when status=error carries no error node", () => {
    render(<StreamingMessage content="partial answer" status="error" />);
    expect(screen.getByText("partial answer")).toBeInTheDocument();
  });
});

describe("StreamingMessage controls", () => {
  it("offers stop while streaming and regenerate once the stream ends", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    const onRegenerate = vi.fn();
    const { rerender } = render(
      <StreamingMessage
        content="Appeal"
        status="streaming"
        onStop={onStop}
        onRegenerate={onRegenerate}
      />
    );

    expect(screen.getByRole("button", { name: "Stop generating" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Regenerate response" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stop generating" }));
    expect(onStop).toHaveBeenCalledTimes(1);

    rerender(
      <StreamingMessage
        content="Appeal"
        status="stopped"
        onStop={onStop}
        onRegenerate={onRegenerate}
      />
    );
    expect(screen.queryByRole("button", { name: "Stop generating" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Regenerate response" }));
    expect(onRegenerate).toHaveBeenCalledTimes(1);
  });

  it("keeps both controls in one named group, after the content in DOM order", () => {
    const { container } = render(
      <StreamingMessage content="Appeal allowed." status="complete" onRegenerate={vi.fn()} />
    );
    const group = screen.getByRole("group", { name: "Response actions" });
    const root = container.firstElementChild as HTMLElement;
    const button = screen.getByRole("button", { name: "Regenerate response" });
    expect(group).toContainElement(button);
    expect(root.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Appeal allowed.").compareDocumentPosition(group)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("renders no group at all when there is nothing to put in it", () => {
    render(<StreamingMessage content="Appeal allowed." status="complete" />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("renders extra actions beside the built-in controls", () => {
    render(
      <StreamingMessage
        content="Appeal allowed."
        status="complete"
        actions={<button type="button">Copy</button>}
      />
    );
    const group = screen.getByRole("group", { name: "Response actions" });
    expect(group).toContainElement(screen.getByRole("button", { name: "Copy" }));
  });

  it("takes label overrides", () => {
    render(
      <StreamingMessage
        content="partial"
        status="error"
        onRegenerate={vi.fn()}
        labels={{ regenerate: "Try again" }}
      />
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("reaches the text before the controls when tabbing", async () => {
    const user = userEvent.setup();
    render(
      <StreamingMessage content="Appeal allowed." status="complete" onRegenerate={vi.fn()} />
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Regenerate response" })).toHaveFocus();
  });
});

describe("StreamingMessage announcements", () => {
  it("stays silent during the stream and announces the whole answer on completion", () => {
    const { container, rerender } = render(
      <StreamingMessage content="Appeal" status="streaming" />
    );
    expect(liveRegion(container)).toBeEmptyDOMElement();

    rerender(<StreamingMessage content="Appeal allowed." status="streaming" />);
    expect(liveRegion(container)).toBeEmptyDOMElement();

    rerender(<StreamingMessage content="Appeal allowed." status="complete" />);
    expect(liveRegion(container)).toHaveTextContent("Appeal allowed.");
  });

  it("flushes each terminated sentence with announceOn=sentence", () => {
    const { container, rerender } = render(
      <StreamingMessage content="The appeal is" status="streaming" announceOn="sentence" />
    );
    expect(liveRegion(container)).toBeEmptyDOMElement();

    rerender(
      <StreamingMessage
        content="The appeal is allowed. The fine is"
        status="streaming"
        announceOn="sentence"
      />
    );
    expect(liveRegion(container)).toHaveTextContent("The appeal is allowed.");

    rerender(
      <StreamingMessage
        content="The appeal is allowed. The fine is set aside."
        status="complete"
        announceOn="sentence"
      />
    );
    /* Only the tail, because the first sentence was already spoken. */
    expect(liveRegion(container)).toHaveTextContent("The fine is set aside.");
  });

  it("announces stopped and errored transitions whatever the strategy", () => {
    const { container, rerender } = render(
      <StreamingMessage content="Appeal" status="streaming" announceOn="sentence" />
    );
    rerender(<StreamingMessage content="Appeal" status="stopped" announceOn="sentence" />);
    expect(liveRegion(container)).toHaveTextContent("Generation stopped");

    rerender(<StreamingMessage content="Appeal" status="error" announceOn="sentence" />);
    expect(liveRegion(container)).toHaveTextContent("Generation failed");
  });

  it("says nothing for a finished message that simply mounts", () => {
    const { container } = render(<StreamingMessage content="Appeal allowed." status="complete" />);
    expect(liveRegion(container)).toBeEmptyDOMElement();
  });

  it("resets between generations so a rerun is announced in full", () => {
    const { container, rerender } = render(<StreamingMessage content="First" status="streaming" />);
    rerender(<StreamingMessage content="First answer." status="complete" />);
    expect(liveRegion(container)).toHaveTextContent("First answer.");

    rerender(<StreamingMessage content="" status="streaming" />);
    expect(liveRegion(container)).toBeEmptyDOMElement();

    rerender(<StreamingMessage content="Second answer." status="complete" />);
    expect(liveRegion(container)).toHaveTextContent("Second answer.");
  });

  it("renders no live region with announce=off", () => {
    const { container } = render(
      <StreamingMessage content="Appeal allowed." status="complete" announce="off" />
    );
    expect(container.querySelector('[aria-live="polite"]')).toBeNull();
  });
});

describe("StreamingMessage throttling", () => {
  it("caps the render rate and still flushes the exact final content", () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <StreamingMessage content="Par" status="streaming" throttleMs={100} announce="off" />
    );
    expect(screen.getByText("Par")).toBeInTheDocument();

    rerender(<StreamingMessage content="Part" status="streaming" throttleMs={100} announce="off" />);
    rerender(<StreamingMessage content="Partia" status="streaming" throttleMs={100} announce="off" />);
    expect(screen.getByText("Par")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Partia")).toBeInTheDocument();

    /* The transition out of "streaming" bypasses the buffer entirely: the
       final text is never a snapshot. */
    rerender(
      <StreamingMessage
        content="Partial answer."
        status="complete"
        throttleMs={100}
        announce="off"
      />
    );
    expect(screen.getByText("Partial answer.")).toBeInTheDocument();
  });

  it("renders every chunk when throttling is off", () => {
    const { rerender } = render(<StreamingMessage content="Par" status="streaming" />);
    rerender(<StreamingMessage content="Partia" status="streaming" />);
    expect(screen.getByText("Partia")).toBeInTheDocument();
  });
});

describe("StreamingMessage accessibility", () => {
  it.each([
    ["idle", <StreamingMessage key="i" content="" status="idle" />],
    [
      "streaming with a stop control",
      <StreamingMessage key="s" content="Appeal" status="streaming" onStop={() => {}} />,
    ],
    [
      "complete with a regenerate control",
      <StreamingMessage
        key="c"
        content="Appeal allowed."
        status="complete"
        onRegenerate={() => {}}
      />,
    ],
    [
      "error with a retry",
      <StreamingMessage
        key="e"
        content="partial"
        status="error"
        error={<>The knowledge base was unreachable.</>}
        onRegenerate={() => {}}
      />,
    ],
  ])("has no axe violations: %s", async (_name, element) => {
    const { container } = render(element);
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });
});
