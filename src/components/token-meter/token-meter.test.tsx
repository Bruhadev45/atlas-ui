import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { TokenMeter } from "./token-meter";

const usage = { prompt: 28_400, completion: 6_112 }; // total 34,512
const budget = 128_000;

function root(container: HTMLElement): HTMLElement {
  return container.firstElementChild as HTMLElement;
}

describe("TokenMeter meter semantics", () => {
  it("exposes role=meter with valuenow/min/max and a human aria-valuetext", () => {
    render(<TokenMeter usage={usage} budget={budget} locale="en-US" />);
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", String(budget));
    expect(meter).toHaveAttribute("aria-valuenow", "34512");
    expect(meter).toHaveAttribute(
      "aria-valuetext",
      "34,512 of 128,000 tokens, 27% of budget used"
    );
    expect(meter).toHaveAccessibleName("Budget");
  });

  it("renders the sr-only fallback sentence with the same information", () => {
    render(<TokenMeter usage={usage} budget={budget} locale="en-US" />);
    const sentence = screen.getByText("34,512 of 128,000 tokens, 27% of budget used");
    expect(sentence).toHaveClass("sr-only");
  });

  it("uses budgetLabel as the meter's accessible name when given", () => {
    render(<TokenMeter usage={usage} budget={budget} budgetLabel="Context window" />);
    expect(screen.getByRole("meter")).toHaveAccessibleName("Context window");
  });

  it("emits no meter role without a budget — just formatted counts", () => {
    const { container } = render(
      <TokenMeter usage={{ prompt: 1_204, completion: 388, total: 1_592 }} />
    );
    expect(screen.queryByRole("meter")).toBeNull();
    expect(container).toHaveTextContent("1.6K");
    expect(root(container)).not.toHaveAttribute("data-state");
  });

  it("sets the fill width through the --atlas-meter-fill custom property", () => {
    const { container } = render(<TokenMeter usage={usage} budget={budget} />);
    const fill = container.querySelector(".atlas-meter-fill") as HTMLElement;
    expect(fill.style.getPropertyValue("--atlas-meter-fill")).toBe(`${(34_512 / budget) * 100}%`);
  });

  it("clamps the fill at 100% when over budget", () => {
    const { container } = render(<TokenMeter usage={usage} budget={30_000} />);
    const fill = container.querySelector(".atlas-meter-fill") as HTMLElement;
    expect(fill.style.getPropertyValue("--atlas-meter-fill")).toBe("100%");
  });

  it("renders abbreviated counts with tabular-nums and aria-live off", () => {
    const { container } = render(<TokenMeter usage={usage} budget={budget} />);
    const counts = container.querySelector('[aria-live="off"]') as HTMLElement;
    expect(counts).toHaveClass("tabular-nums");
    expect(counts).toHaveTextContent("34.5K / 128K");
  });
});

describe("TokenMeter thresholds and over-budget", () => {
  it("moves data-state through ok, warn, danger", () => {
    const { container, rerender } = render(
      <TokenMeter usage={{ prompt: 10_000, completion: 0 }} budget={100_000} />
    );
    expect(root(container)).toHaveAttribute("data-state", "ok");

    rerender(<TokenMeter usage={{ prompt: 80_000, completion: 0 }} budget={100_000} />);
    expect(root(container)).toHaveAttribute("data-state", "warn");

    rerender(<TokenMeter usage={{ prompt: 95_000, completion: 0 }} budget={100_000} />);
    expect(root(container)).toHaveAttribute("data-state", "danger");
  });

  it("honours custom thresholds", () => {
    const { container } = render(
      <TokenMeter
        usage={{ prompt: 72_000, completion: 0 }}
        budget={100_000}
        thresholds={{ warn: 0.7, danger: 0.85 }}
      />
    );
    expect(root(container)).toHaveAttribute("data-state", "warn");
  });

  it("marks over-budget with data-over-budget, visible text, and an icon", () => {
    const { container } = render(<TokenMeter usage={usage} budget={30_000} />);
    expect(root(container)).toHaveAttribute("data-over-budget", "true");
    expect(root(container)).toHaveAttribute("data-state", "danger");
    // The text appears both visibly and in the threshold live region.
    const visible = screen
      .getAllByText("over budget")
      .find((el) => el.closest('[aria-live="polite"]') === null);
    expect(visible).toBeDefined();
    expect(visible?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    const meter = screen.getByRole("meter");
    expect(meter.getAttribute("aria-valuetext")).toContain("over budget");
  });

  it("fires onOverBudget once per crossing, not per render", () => {
    const onOverBudget = vi.fn();
    const { rerender } = render(
      <TokenMeter usage={{ prompt: 10_000, completion: 0 }} budget={30_000} onOverBudget={onOverBudget} />
    );
    expect(onOverBudget).not.toHaveBeenCalled();

    rerender(<TokenMeter usage={usage} budget={30_000} onOverBudget={onOverBudget} />);
    expect(onOverBudget).toHaveBeenCalledTimes(1);
    expect(onOverBudget).toHaveBeenCalledWith({ total: 34_512, budget: 30_000 });

    rerender(
      <TokenMeter usage={{ prompt: 40_000, completion: 0 }} budget={30_000} onOverBudget={onOverBudget} />
    );
    expect(onOverBudget).toHaveBeenCalledTimes(1);

    // Dropping back under and crossing again fires again.
    rerender(
      <TokenMeter usage={{ prompt: 10_000, completion: 0 }} budget={30_000} onOverBudget={onOverBudget} />
    );
    rerender(
      <TokenMeter usage={{ prompt: 40_000, completion: 0 }} budget={30_000} onOverBudget={onOverBudget} />
    );
    expect(onOverBudget).toHaveBeenCalledTimes(2);
  });

  it("announces threshold crossings once each in a polite region", () => {
    const { container, rerender } = render(
      <TokenMeter usage={{ prompt: 10_000, completion: 0 }} budget={100_000} />
    );
    const region = container.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region).toHaveTextContent("");

    rerender(<TokenMeter usage={{ prompt: 80_000, completion: 0 }} budget={100_000} />);
    expect(region).toHaveTextContent("75% of budget used");

    // Re-render inside the same band: no new announcement content.
    rerender(<TokenMeter usage={{ prompt: 82_000, completion: 0 }} budget={100_000} />);
    expect(region).toHaveTextContent("75% of budget used");

    rerender(<TokenMeter usage={{ prompt: 95_000, completion: 0 }} budget={100_000} />);
    expect(region).toHaveTextContent("90% of budget used");

    rerender(<TokenMeter usage={{ prompt: 120_000, completion: 0 }} budget={100_000} />);
    expect(region).toHaveTextContent("over budget");
  });
});

describe("TokenMeter totals and cost", () => {
  it("computes total as prompt + completion + reasoning when absent", () => {
    render(
      <TokenMeter usage={{ prompt: 1_000, completion: 500, reasoning: 250 }} budget={10_000} />
    );
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "1750");
  });

  it("prefers an explicit usage.total", () => {
    render(<TokenMeter usage={{ prompt: 1_000, completion: 500, total: 9_999 }} budget={10_000} />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "9999");
  });

  it("computes cost from pricing with the cached discount", () => {
    render(
      <TokenMeter
        usage={{ prompt: 28_400, completion: 6_112, cached: 24_000 }}
        budget={budget}
        pricing={{ promptPerMTok: 3, completionPerMTok: 15, cachedPromptPerMTok: 0.3 }}
      />
    );
    expect(screen.getByText("$0.1121")).toBeInTheDocument();
    expect(screen.getByText("Estimated cost")).toHaveClass("sr-only");
  });

  it("lets a precomputed cost win over pricing and accepts a formatCost override", () => {
    render(
      <TokenMeter
        usage={usage}
        cost={0.0092}
        pricing={{ promptPerMTok: 999, completionPerMTok: 999 }}
        formatCost={(cost, currency) => `${currency} ${cost.toFixed(4)}`}
      />
    );
    expect(screen.getByText("USD 0.0092")).toBeInTheDocument();
  });
});

describe("TokenMeter variants and collapsible", () => {
  it("hides the breakdown in compact and shows it when variant=expanded", () => {
    const { rerender } = render(<TokenMeter usage={usage} budget={budget} />);
    expect(screen.queryByText("Prompt")).toBeNull();

    rerender(<TokenMeter usage={usage} budget={budget} variant="expanded" />);
    expect(screen.getByText("Prompt")).toBeInTheDocument();
    expect(screen.getByText("Completion")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows cached and reasoning rows only when present in usage", () => {
    render(
      <TokenMeter
        usage={{ prompt: 100, completion: 50, cached: 20, reasoning: 10 }}
        variant="expanded"
      />
    );
    expect(screen.getByText("Cached")).toBeInTheDocument();
    expect(screen.getByText("Reasoning")).toBeInTheDocument();
  });

  it("toggles through a Radix collapsible with aria-expanded and aria-controls", async () => {
    const user = userEvent.setup();
    const onVariantChange = vi.fn();
    const { container } = render(
      <TokenMeter usage={usage} budget={budget} collapsible onVariantChange={onVariantChange} />
    );
    const trigger = screen.getByRole("button", { name: "Show details" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // Radix wires aria-controls to the content once it is mounted.
    expect(trigger).toHaveAttribute("aria-controls");
    const contentId = trigger.getAttribute("aria-controls") as string;
    expect(document.getElementById(contentId)).not.toBeNull();
    expect(trigger).toHaveTextContent("Hide details");
    expect(onVariantChange).toHaveBeenCalledWith("expanded");
    expect(screen.getByText("Prompt")).toBeInTheDocument();
    expect(root(container)).toHaveAttribute("data-variant", "expanded");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(onVariantChange).toHaveBeenCalledWith("compact");
  });

  it("keeps a controlled variant under consumer control", async () => {
    const user = userEvent.setup();
    const onVariantChange = vi.fn();
    render(
      <TokenMeter
        usage={usage}
        budget={budget}
        collapsible
        variant="compact"
        onVariantChange={onVariantChange}
      />
    );
    await user.click(screen.getByRole("button", { name: "Show details" }));
    expect(onVariantChange).toHaveBeenCalledWith("expanded");
    // Consumer did not update the prop, so the details stay closed.
    expect(screen.queryByText("Prompt")).toBeNull();
  });

  it("starts expanded with defaultVariant when collapsible", () => {
    render(<TokenMeter usage={usage} budget={budget} collapsible defaultVariant="expanded" />);
    expect(screen.getByRole("button", { name: "Hide details" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(screen.getByText("Prompt")).toBeInTheDocument();
  });
});

describe("TokenMeter contract", () => {
  it("merges className last, spreads props, forwards ref, sets displayName", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { container } = render(
      <TokenMeter ref={ref} usage={usage} budget={budget} className="text-xs" data-testid="meter" />
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(TokenMeter.displayName).toBe("TokenMeter");
    expect(root(container)).toHaveAttribute("data-testid", "meter");
    expect(root(container).className).toContain("text-xs");
    expect(root(container).className).not.toContain("text-sm");
  });

  it("merges labels overrides over English defaults", () => {
    render(
      <TokenMeter
        usage={usage}
        budget={30_000}
        variant="expanded"
        labels={{ overBudget: "Kontext voll", total: "Gesamt" }}
      />
    );
    // Appears visibly and in the threshold live region: both use the override.
    expect(screen.getAllByText("Kontext voll").length).toBeGreaterThan(0);
    expect(screen.getByText("Gesamt")).toBeInTheDocument();
    expect(screen.getByText("Prompt")).toBeInTheDocument();
  });

  it("formats numbers with the given locale", () => {
    render(<TokenMeter usage={usage} budget={budget} locale="de-DE" />);
    expect(screen.getByRole("meter").getAttribute("aria-valuetext")).toContain("34.512");
  });
});

describe("TokenMeter axe", () => {
  it("has no violations compact with a budget", async () => {
    const { container } = render(<TokenMeter usage={usage} budget={budget} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations expanded with cost", async () => {
    const { container } = render(
      <TokenMeter
        usage={{ prompt: 28_400, completion: 6_112, cached: 24_000, reasoning: 100 }}
        budget={budget}
        variant="expanded"
        pricing={{ promptPerMTok: 3, completionPerMTok: 15 }}
      />
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations over budget", async () => {
    const { container } = render(<TokenMeter usage={usage} budget={30_000} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations without a budget", async () => {
    const { container } = render(<TokenMeter usage={{ prompt: 1_204, completion: 388 }} cost={0.0092} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations with the collapsible open and closed", async () => {
    const user = userEvent.setup();
    const { container } = render(<TokenMeter usage={usage} budget={budget} collapsible />);
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole("button", { name: "Show details" }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
