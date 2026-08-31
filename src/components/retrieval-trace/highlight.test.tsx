import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { highlightTerms, queryTerms } from "./highlight";

describe("queryTerms", () => {
  it("lowercases, splits on punctuation, and drops one-character tokens", () => {
    expect(queryTerms("Unlawful Assembly, s. 149?")).toEqual(["unlawful", "assembly", "149"]);
  });

  it("dedupes repeated terms", () => {
    expect(queryTerms("assembly ASSEMBLY assembly")).toEqual(["assembly"]);
  });

  it("keeps non-Latin words", () => {
    expect(queryTerms("धारा 149")).toEqual(["धारा", "149"]);
  });

  it("returns nothing for a query with no usable terms", () => {
    expect(queryTerms("*** ? a")).toEqual([]);
  });
});

describe("highlightTerms", () => {
  it("returns the string untouched when there are no terms", () => {
    expect(highlightTerms("plain text", [])).toBe("plain text");
  });

  it("returns the string untouched when nothing matches", () => {
    expect(highlightTerms("plain text", ["absent"])).toBe("plain text");
  });

  it("marks every occurrence, case-insensitively", () => {
    render(<p>{highlightTerms("Assembly and assembly", ["assembly"])}</p>);
    const marks = screen.getAllByText(/assembly/i);
    expect(marks.map((m) => m.textContent)).toEqual(["Assembly", "assembly"]);
    expect(marks[0]!.tagName).toBe("MARK");
  });

  it("treats regex metacharacters in a term as literal text", () => {
    render(<p data-testid="out">{highlightTerms("c++ and c-- code", ["c++"])}</p>);
    expect(screen.getByTestId("out")).toHaveTextContent("c++ and c-- code");
    expect(screen.getByTestId("out").querySelectorAll("mark")).toHaveLength(1);
    expect(screen.getByTestId("out").querySelector("mark")).toHaveTextContent("c++");
  });

  it("prefers the longest term when two overlap at one position", () => {
    render(<p data-testid="out">{highlightTerms("retrieval", ["retrieve", "retrieval"])}</p>);
    expect(screen.getByTestId("out").querySelector("mark")).toHaveTextContent("retrieval");
  });
});
