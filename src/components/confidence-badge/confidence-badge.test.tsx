import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { ConfidenceBadge } from "./confidence-badge";
import type { ConfidenceBadgeLabels, ConfidenceLevel } from "./confidence-badge.types";

const levels: readonly ConfidenceLevel[] = ["high", "medium", "low", "insufficient"];
const variants = ["soft", "solid", "outline"] as const;

describe("ConfidenceBadge rendering", () => {
  it.each(levels)("renders the visible level text and data-level for %s", (level) => {
    const { container } = render(<ConfidenceBadge level={level} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-level", level);
    const expectedText: Record<ConfidenceLevel, string> = {
      high: "High",
      medium: "Medium",
      low: "Low",
      insufficient: "Insufficient evidence",
    };
    expect(root).toHaveTextContent(expectedText[level]);
  });

  it("builds the accessible name from the sr-only prefix, not aria-label", () => {
    const { container } = render(
      <ConfidenceBadge level="high" score={0.91} description="based on 5 sources" />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).not.toHaveAttribute("aria-label");
    expect(root.textContent).toBe("Confidence: High (0.91), based on 5 sources");
  });

  it("shows the score visibly (tabular-nums) only when showScore is set", () => {
    const { container, rerender } = render(<ConfidenceBadge level="high" score={0.91} />);
    expect(container.querySelector(".tabular-nums")).toBeNull();

    rerender(<ConfidenceBadge level="high" score={0.91} showScore />);
    const visibleScore = container.querySelector(".tabular-nums");
    expect(visibleScore).toHaveTextContent("0.91");
    expect(visibleScore).not.toHaveClass("sr-only");
  });

  it.each(levels)("renders a distinct aria-hidden icon shape for %s", (level) => {
    const { container } = render(<ConfidenceBadge level={level} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("renders four different icon paths across the four levels", () => {
    const markup = levels.map(
      (level) => render(<ConfidenceBadge level={level} />).container.querySelector("svg")?.innerHTML
    );
    expect(new Set(markup).size).toBe(4);
  });

  it("removes the icon with icon={false} and accepts a custom icon node", () => {
    const { container, rerender } = render(<ConfidenceBadge level="high" icon={false} />);
    expect(container.querySelector("svg")).toBeNull();

    rerender(<ConfidenceBadge level="high" icon={<em data-testid="custom-icon">!</em>} />);
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    expect(screen.getByTestId("custom-icon").parentElement).toHaveAttribute("aria-hidden", "true");
  });

  it.each(variants)("applies the static class map for the %s variant", (variant) => {
    const { container } = render(<ConfidenceBadge level="high" variant={variant} />);
    const root = container.firstElementChild as HTMLElement;
    const expected: Record<(typeof variants)[number], string> = {
      soft: "bg-conf-high/12",
      solid: "bg-conf-high",
      outline: "border-conf-high",
    };
    expect(root.className).toContain(expected[variant]);
  });

  it("merges the consumer className last and spreads unknown props", () => {
    const { container } = render(
      <ConfidenceBadge level="low" className="px-8" data-testid="badge" title="hello" />
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-testid", "badge");
    expect(root).toHaveAttribute("title", "hello");
    expect(root.className).toContain("px-8");
    expect(root.className).not.toContain("px-2");
  });

  it("forwards its ref to the root span and sets displayName", () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<ConfidenceBadge ref={ref} level="medium" />);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
    expect(ConfidenceBadge.displayName).toBe("ConfidenceBadge");
  });

  it("merges labels overrides over English defaults, including nested levels", () => {
    render(
      <ConfidenceBadge
        level="insufficient"
        labels={{
          prefix: "Vertrauen: ",
          levels: { insufficient: "No supporting statute found" } as ConfidenceBadgeLabels["levels"],
        }}
      />
    );
    expect(screen.getByText("No supporting statute found")).toBeInTheDocument();
    expect(screen.getByText("Vertrauen:")).toBeInTheDocument();
  });
});

describe("ConfidenceBadge calibration", () => {
  it("renders no info affordance without calibration content", () => {
    render(<ConfidenceBadge level="high" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders a labelled info button wired to a tooltip, closable with Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfidenceBadge
        level="high"
        calibration={<>Calibrated on a 120-query benchmark.</>}
        defaultOpen
        onOpenChange={onOpenChange}
      />
    );
    const button = screen.getByRole("button", { name: "How this is calculated" });
    expect(button).toHaveAttribute("type", "button");
    expect(screen.getAllByText("Calibrated on a 120-query benchmark.").length).toBeGreaterThan(0);

    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() =>
      expect(screen.queryAllByText("Calibrated on a 120-query benchmark.")).toHaveLength(0)
    );
  });

  it("uses a popover for interactive calibration content, opened by click", async () => {
    const user = userEvent.setup();
    render(
      <ConfidenceBadge
        level="medium"
        score={0.71}
        calibrationAs="popover"
        calibration={
          <p>
            Derived from retrieval agreement. <a href="/docs/confidence">Methodology</a>
          </p>
        }
      />
    );
    const button = screen.getByRole("button", { name: "How this is calculated" });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("link", { name: "Methodology" })).toBeInTheDocument();
  });

  it("supports a custom calibration label", () => {
    render(
      <ConfidenceBadge level="low" calibration="why" labels={{ calibration: "Wie berechnet?" }} />
    );
    expect(screen.getByRole("button", { name: "Wie berechnet?" })).toBeInTheDocument();
  });
});

describe("ConfidenceBadge axe", () => {
  it.each(levels)("has no violations for the %s level (soft)", async (level) => {
    const { container } = render(<ConfidenceBadge level={level} score={0.5} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each(variants)("has no violations for the %s variant", async (variant) => {
    const { container } = render(<ConfidenceBadge level="high" variant={variant} showScore score={0.91} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations at size sm with a description", async () => {
    const { container } = render(
      <ConfidenceBadge level="medium" size="sm" description="based on 5 sources" />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  // Radix portals the calibration content to <body>, so these run axe over
  // the whole page; the page-level "region" landmark rule does not apply to a
  // component fixture.
  const pageAxeOptions = { rules: { region: { enabled: false } } };

  it("has no violations with the tooltip open", async () => {
    const { baseElement } = render(
      <ConfidenceBadge level="high" calibration="Calibration text" defaultOpen />
    );
    expect(await axe(baseElement, pageAxeOptions)).toHaveNoViolations();
  });

  it("has no violations with the popover open", async () => {
    const { baseElement } = render(
      <ConfidenceBadge
        level="low"
        calibrationAs="popover"
        calibration={<a href="/docs">Methodology</a>}
        defaultOpen
      />
    );
    expect(await axe(baseElement, pageAxeOptions)).toHaveNoViolations();
  });
});
