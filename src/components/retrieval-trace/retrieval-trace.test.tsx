import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { RetrievalTrace } from "./retrieval-trace";
/* The fixture is shared with the stories so the two can never drift (SPEC 7). */
import { retrievedChunks as chunks, retrievers } from "../../stories/fixtures";

/* The component fixture is not a page, so the landmark rule does not apply. */
const axeOptions = { rules: { region: { enabled: false } } };

function traceList(): HTMLElement {
  return screen.getByRole("list", { description: /BM25|bm25/ });
}

describe("RetrievalTrace structure", () => {
  it("renders an ordered list with one row per chunk, ranked from 1", () => {
    render(<RetrievalTrace chunks={chunks} retrievers={retrievers} />);
    const rows = screen.getAllByRole("listitem");
    /* Two legend entries + two chunks. */
    expect(rows).toHaveLength(4);
    const trace = traceList();
    expect(trace.tagName).toBe("OL");
    const traceRows = within(trace).getAllByRole("listitem");
    expect(traceRows).toHaveLength(2);
    expect(traceRows[0]!.querySelector("[data-rank]")).toHaveTextContent("rank 1");
    expect(traceRows[1]!.querySelector("[data-rank]")).toHaveTextContent("rank 2");
  });

  it("names each row with the chunk title and pin-cite", () => {
    render(<RetrievalTrace chunks={chunks} retrievers={retrievers} />);
    expect(
      screen.getByRole("button", { name: /Indian Penal Code, 1860 § 149/ })
    ).toBeInTheDocument();
  });

  it("falls back to the locator, then the key, when a chunk has no title", () => {
    render(
      <RetrievalTrace
        chunks={[
          { key: "k1", score: 1, locator: "§ 12" },
          { key: "k2", score: 1 },
        ]}
      />
    );
    expect(screen.getByRole("button", { name: "§ 12" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "k2" })).toBeInTheDocument();
  });

  it("describes the list with the retriever legend", () => {
    render(<RetrievalTrace chunks={chunks} retrievers={retrievers} />);
    const legend = screen.getAllByRole("list").find((l) => l.tagName === "UL")!;
    expect(traceList()).toHaveAttribute("aria-describedby", legend.id);
    expect(within(legend).getByText("BM25 · w 0.6")).toBeInTheDocument();
    expect(within(legend).getByText("InLegalBERT · w 0.4")).toBeInTheDocument();
  });

  it("renders the query as a header", () => {
    render(<RetrievalTrace chunks={chunks} query="unlawful assembly" />);
    expect(screen.getByText("unlawful assembly")).toBeInTheDocument();
    expect(screen.getByText("Query:")).toHaveClass("sr-only");
  });

  it("merges className, spreads unknown props, and forwards its ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <RetrievalTrace
        ref={ref}
        chunks={chunks}
        density="compact"
        className="mt-4"
        data-testid="trace"
      />
    );
    const root = screen.getByTestId("trace");
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute("data-density", "compact");
    expect(root.className).toContain("mt-4");
    expect(within(traceList()).getAllByRole("listitem")[0]!.className).toContain("p-2");
  });
});

describe("RetrievalTrace provenance", () => {
  it("renders provenance as text first", () => {
    render(<RetrievalTrace chunks={chunks} />);
    expect(screen.getByText("bm25 · rank 1 · w 0.6")).toBeInTheDocument();
    expect(screen.getByText("bm25 · rank 1 · w 0.6")).toHaveTextContent("bm25 · rank 1 · w 0.6");
    expect(screen.getByText("dense · rank 3 · w 0.4")).toBeInTheDocument();
  });

  it("infers the legend from contributions when no retrievers are declared", () => {
    render(<RetrievalTrace chunks={chunks} />);
    const legend = screen.getAllByRole("list").find((l) => l.tagName === "UL")!;
    expect(within(legend).getByText("bm25 · w 0.6")).toBeInTheDocument();
    expect(within(legend).getByText("dense · w 0.4")).toBeInTheDocument();
  });

  it("assigns each retriever a palette slot from the token layer", () => {
    render(<RetrievalTrace chunks={chunks} />);
    const bm25 = screen.getByText("bm25 · rank 1 · w 0.6");
    const dense = screen.getByText("dense · rank 3 · w 0.4");
    expect(bm25.style.getPropertyValue("--atlas-retriever")).toBe("var(--atlas-retriever-1)");
    expect(dense.style.getPropertyValue("--atlas-retriever")).toBe("var(--atlas-retriever-2)");
  });

  it("honours a declared colour", () => {
    render(
      <RetrievalTrace chunks={chunks} retrievers={[{ name: "bm25", color: "10 90% 50%" }]} />
    );
    expect(
      screen.getByText("bm25 · rank 1 · w 0.6").style.getPropertyValue("--atlas-retriever")
    ).toBe("10 90% 50%");
  });

  it("drops badges and legend when showProvenance is false", () => {
    render(<RetrievalTrace chunks={chunks} retrievers={retrievers} showProvenance={false} />);
    expect(screen.queryByText("bm25 · rank 1 · w 0.6")).not.toBeInTheDocument();
    expect(screen.getAllByRole("list").every((l) => l.tagName === "OL")).toBe(true);
  });
});

describe("RetrievalTrace scores", () => {
  it("shows the normalised score by default", () => {
    render(<RetrievalTrace chunks={chunks} />);
    expect(screen.getByText("Fused score 1.00")).toBeInTheDocument();
    expect(screen.getByText("Fused score 0.50")).toBeInTheDocument();
  });

  it("shows the raw weighted RRF sum", () => {
    render(<RetrievalTrace chunks={chunks} scoreDisplay="raw" />);
    expect(screen.getByText("Fused score 0.0163")).toBeInTheDocument();
  });

  it("qualifies the normalised score with the raw one", () => {
    render(<RetrievalTrace chunks={chunks} scoreDisplay="both" />);
    expect(screen.getByText("Fused score 1.00 (raw 0.0163)")).toBeInTheDocument();
  });

  it("derives a normalised score from the top hit when the field is absent", () => {
    render(
      <RetrievalTrace
        chunks={[
          { key: "a", score: 0.02, title: "A" },
          { key: "b", score: 0.01, title: "B" },
        ]}
      />
    );
    expect(screen.getByText("Fused score 1.00")).toBeInTheDocument();
    expect(screen.getByText("Fused score 0.50")).toBeInTheDocument();
  });

  it("hides the score bar from the accessibility tree", () => {
    const { container } = render(<RetrievalTrace chunks={chunks} />);
    const bar = container.querySelector(".atlas-meter-fill");
    expect(bar?.parentElement).toHaveAttribute("aria-hidden", "true");
    expect(bar).toHaveStyle({ "--atlas-meter-fill": "100%" });
  });
});

describe("RetrievalTrace expansion", () => {
  it("expands and collapses a row, uncontrolled", async () => {
    const user = userEvent.setup();
    render(<RetrievalTrace chunks={chunks} />);
    const trigger = screen.getByRole("button", { name: /Indian Penal Code/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Open source" })).not.toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls");
    expect(screen.getByRole("link", { name: "Open source" })).toHaveAttribute(
      "href",
      "/corpus/ipc/149"
    );

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the rows named by defaultExpandedKeys", () => {
    render(<RetrievalTrace chunks={chunks} defaultExpandedKeys={["crpc-107"]} />);
    expect(screen.getByRole("button", { name: /Criminal Procedure/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });

  it("stays controlled when expandedKeys is supplied", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(
      <RetrievalTrace
        chunks={chunks}
        expandedKeys={["ipc-149"]}
        onExpandedChange={onExpandedChange}
      />
    );
    const trigger = screen.getByRole("button", { name: /Indian Penal Code/ });
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.click(trigger);
    expect(onExpandedChange).toHaveBeenCalledWith([]);
    /* The consumer owns the state, so the DOM must not move on its own. */
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("reports additions without dropping the keys already open", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(
      <RetrievalTrace
        chunks={chunks}
        defaultExpandedKeys={["ipc-149"]}
        onExpandedChange={onExpandedChange}
      />
    );
    await user.click(screen.getByRole("button", { name: /Criminal Procedure/ }));
    expect(onExpandedChange).toHaveBeenCalledWith(["ipc-149", "crpc-107"]);
  });

  it("moves to the trigger with Tab and toggles with Enter", async () => {
    const user = userEvent.setup();
    render(<RetrievalTrace chunks={chunks} />);
    const trigger = screen.getByRole("button", { name: /Indian Penal Code/ });

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("puts long chunk text in a keyboard-reachable scroll region", async () => {
    const user = userEvent.setup();
    const { container } = render(<RetrievalTrace chunks={chunks} />);
    await user.click(screen.getByRole("button", { name: /Indian Penal Code/ }));
    const region = container.querySelector("div[tabindex='0']");
    expect(region).toHaveTextContent(/Every member of an unlawful assembly/);
  });

  it("renders primitive meta rows and skips nested objects", async () => {
    const user = userEvent.setup();
    render(<RetrievalTrace chunks={chunks} />);
    await user.click(screen.getByRole("button", { name: /Indian Penal Code/ }));
    expect(screen.getByText("court")).toBeInTheDocument();
    expect(screen.getByText("Supreme Court")).toBeInTheDocument();
    expect(screen.getByText("1860")).toBeInTheDocument();
    expect(screen.queryByText("raw")).not.toBeInTheDocument();
  });
});

describe("RetrievalTrace selection", () => {
  it("reports the whole chunk on activation", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<RetrievalTrace chunks={chunks} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /Criminal Procedure/ }));
    expect(onSelect).toHaveBeenCalledWith(chunks[1]);
  });

  it("marks the selected row for both assistive tech and sight", () => {
    render(<RetrievalTrace chunks={chunks} selectedKey="crpc-107" />);
    const selected = screen.getByRole("button", { name: /Criminal Procedure/ });
    expect(selected).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Indian Penal Code/ })).not.toHaveAttribute(
      "aria-current"
    );
    const row = selected.closest("li")!;
    expect(row).toHaveAttribute("data-selected", "true");
    expect(row.className).toContain("ring-accent/40");
  });
});

describe("RetrievalTrace text rendering", () => {
  it("truncates the collapsed snippet at maxSnippetChars", () => {
    render(<RetrievalTrace chunks={chunks} maxSnippetChars={20} />);
    expect(screen.getByText("Every member of an u…")).toBeInTheDocument();
  });

  it("marks query terms without parsing HTML", () => {
    const { container } = render(
      <RetrievalTrace chunks={chunks} query="unlawful assembly" highlightQueryTerms />
    );
    const marks = [...container.querySelectorAll("mark")].map((m) => m.textContent);
    expect(marks).toContain("unlawful");
    expect(marks).toContain("assembly");
  });

  it("leaves the text alone when highlighting is off", () => {
    const { container } = render(<RetrievalTrace chunks={chunks} query="unlawful assembly" />);
    expect(container.querySelectorAll("mark")).toHaveLength(0);
  });

  it("survives a query full of punctuation", () => {
    const { container } = render(
      <RetrievalTrace
        chunks={[{ key: "a", score: 1, title: "A", text: "an unlawful assembly (s. 149)" }]}
        query="unlawful (assembly)?"
        highlightQueryTerms
      />
    );
    expect([...container.querySelectorAll("mark")].map((m) => m.textContent)).toEqual([
      "unlawful",
      "assembly",
    ]);
  });

  it("renders corpus text as text, never as markup", () => {
    render(
      <RetrievalTrace chunks={[{ key: "a", score: 1, title: "A", text: "<img src=x>" }]} />
    );
    expect(screen.getByText("<img src=x>")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("RetrievalTrace customisation", () => {
  it("lets renderChunk own the body while the library keeps provenance", () => {
    render(
      <RetrievalTrace
        chunks={chunks}
        renderChunk={(chunk, ctx) => (
          <p>
            custom {chunk.key} #{ctx.rank} {ctx.expanded ? "open" : "closed"}
          </p>
        )}
      />
    );
    expect(screen.getByText("custom ipc-149 #1 closed")).toBeInTheDocument();
    expect(screen.queryByText(/Every member of an unlawful/)).not.toBeInTheDocument();
    expect(screen.getByText("bm25 · rank 1 · w 0.6")).toBeInTheDocument();
  });

  it("overrides every label", () => {
    render(
      <RetrievalTrace
        chunks={chunks}
        labels={{ rank: "position", score: "Score", weight: "weight" }}
      />
    );
    expect(screen.getByText("bm25 · position 1 · weight 0.6")).toBeInTheDocument();
    expect(screen.getByText("Score 1.00")).toBeInTheDocument();
  });

  it("shows the default empty state", () => {
    render(<RetrievalTrace chunks={[]} />);
    expect(screen.getByText("No chunks retrieved")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows a supplied empty state", () => {
    render(<RetrievalTrace chunks={[]} emptyState={<p>Try naming a company.</p>} />);
    expect(screen.getByText("Try naming a company.")).toBeInTheDocument();
  });
});

describe("RetrievalTrace accessibility", () => {
  it("has no axe violations when collapsed", async () => {
    const { container } = render(
      <RetrievalTrace chunks={chunks} retrievers={retrievers} query="unlawful assembly" />
    );
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it("has no axe violations with a row expanded and selected", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RetrievalTrace chunks={chunks} retrievers={retrievers} selectedKey="ipc-149" />
    );
    await user.click(screen.getByRole("button", { name: /Indian Penal Code/ }));
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });

  it("has no axe violations when empty", async () => {
    const { container } = render(<RetrievalTrace chunks={[]} />);
    expect(await axe(container, axeOptions)).toHaveNoViolations();
  });
});
