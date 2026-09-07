import * as React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CitationChip } from "../components/citation-chip/citation-chip";
import { ConfidenceBadge } from "../components/confidence-badge/confidence-badge";
import { TokenMeter } from "../components/token-meter/token-meter";
import { RetrievalTrace } from "../components/retrieval-trace/retrieval-trace";
import { ToolCallTimeline } from "../components/tool-call-timeline/tool-call-timeline";
import { StreamingMessage } from "../components/streaming-message/streaming-message";
import { AssistantComposer } from "../components/assistant-composer/assistant-composer";
import {
  citationSource,
  retrievalQuery,
  retrievedChunks,
  retrievers,
  slashCommands,
  streamingAnswer,
  tokenBudget,
  tokenPricing,
  tokenUsageDetailed,
  toolCalls,
} from "../stories/fixtures";

/**
 * The library ships no preflight (SPEC section 4), so nothing zeroes the user
 * agent's own margins on the block elements the components render. A `<p>`
 * carrying `margin: 1em 0` and a `<ul>` carrying `padding-inline-start: 40px`
 * plus a bullet are the browser's defaults, not the component's design — in a
 * Mode A app (`import "atlas-ui/styles.css"`, no reset of its own) they leak
 * straight into the layout.
 *
 * So every block element the library owns has to reset itself locally. These
 * tests read the class list rather than computed style because jsdom never
 * loads the stylesheet; the assertion is on the contract the built CSS then
 * honours.
 */

/** Elements whose UA stylesheet sets a block margin. */
const MARGIN_SELECTOR = "p, dl, dd, pre, blockquote, figure, h1, h2, h3, h4, h5, h6";
/** Elements that additionally get a marker and an inline-start padding. */
const LIST_SELECTOR = "ul, ol";

const MARGIN_UTILITIES = ["m-0", "my-0", "mb-0"];
/** Any explicit inline-start padding overrides the UA's 40px; `p-1` is as valid as `p-0`. */
const PADDING_PREFIXES = ["p-", "px-", "ps-", "pl-"];

function classesOf(el: Element): string[] {
  return el.className.split(/\s+/).filter(Boolean);
}

/** A description an assertion failure can name the offending element by. */
function describeEl(el: Element): string {
  return `<${el.tagName.toLowerCase()} class="${el.className}">`;
}

function assertReset(container: HTMLElement): void {
  const blocks = Array.from(container.querySelectorAll(MARGIN_SELECTOR))
    // Visually hidden announcers are clipped to a 1px box; their margins never show.
    .filter((el) => !el.classList.contains("sr-only"));

  for (const el of blocks) {
    const classes = classesOf(el);
    const zeroed =
      classes.some((c) => MARGIN_UTILITIES.includes(c)) ||
      (classes.some((c) => c.startsWith("mt-")) && classes.some((c) => c.startsWith("mb-")));
    expect(zeroed, `${describeEl(el)} does not reset its user-agent margin`).toBe(true);
  }

  for (const el of Array.from(container.querySelectorAll(LIST_SELECTOR))) {
    const classes = classesOf(el);
    expect(classes, `${describeEl(el)} keeps its user-agent bullet`).toContain("list-none");
    expect(
      classes.some((c) => PADDING_PREFIXES.some((prefix) => c.startsWith(prefix))),
      `${describeEl(el)} does not set its own inline-start padding`
    ).toBe(true);
  }
}

describe("user-agent style reset", () => {
  it("CitationChip's open preview owns its margins", () => {
    const { baseElement } = render(
      <CitationChip index={1} source={citationSource} defaultOpen openOnHover={false} />
    );
    // The preview portals out of `container`, so scan the whole document body.
    assertReset(baseElement as HTMLElement);
  });

  it("ConfidenceBadge owns its margins", () => {
    const { container } = render(<ConfidenceBadge level="high" score={0.91} showScore />);
    assertReset(container);
  });

  it("TokenMeter's breakdown list owns its margins", () => {
    const { container } = render(
      <TokenMeter
        usage={tokenUsageDetailed}
        budget={tokenBudget}
        pricing={tokenPricing}
        variant="expanded"
      />
    );
    assertReset(container);
  });

  it("RetrievalTrace's legend and ranking own their bullets and margins", () => {
    const { container } = render(
      <RetrievalTrace
        chunks={retrievedChunks}
        retrievers={retrievers}
        query={retrievalQuery}
        highlightQueryTerms
        defaultExpandedKeys={retrievedChunks.map((chunk) => chunk.key)}
      />
    );
    assertReset(container);
  });

  it("ToolCallTimeline's nested rows own their bullets and margins", () => {
    const { container } = render(
      <ToolCallTimeline calls={toolCalls} defaultExpandedIds={["t1", "t2"]} />
    );
    assertReset(container);
  });

  it("StreamingMessage owns its margins", () => {
    const { container } = render(
      <StreamingMessage content={streamingAnswer} status="complete" onRegenerate={() => undefined} />
    );
    assertReset(container);
  });

  it("AssistantComposer's attachments and open command menu own their bullets", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <AssistantComposer
        commands={slashCommands}
        onCommandSelect={() => undefined}
        onSubmit={() => undefined}
      />
    );
    await user.type(screen.getByRole("combobox"), "/");
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    assertReset(container);
  });

  it("renders empty states without a stray user-agent margin", () => {
    const { container } = render(
      <>
        <RetrievalTrace chunks={[]} />
        <ToolCallTimeline calls={[]} />
      </>
    );
    assertReset(container);
  });
});
