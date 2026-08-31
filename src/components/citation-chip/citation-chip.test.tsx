import * as React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { describe, expect, it, vi } from "vitest";
import { CitationChip } from "./citation-chip";
import type { CitationSource } from "./citation-chip.types";

const source: CitationSource = {
  id: "sec-149",
  title: "Indian Penal Code, 1860",
  locator: "§ 149",
  snippet: "Every member of unlawful assembly guilty of offence committed in prosecution of common object.",
  score: 0.92,
  scoreLabel: "fused",
  retriever: "bm25 + InLegalBERT",
  url: "/corpus/ipc/149",
  meta: { Filed: "1860-10-06" },
};

const name = "Citation 1: Indian Penal Code, 1860 § 149";

/* Radix portals the preview to <body>, so axe runs over the whole page; the
   page-level "region" landmark rule does not apply to a component fixture. */
const pageAxeOptions = { rules: { region: { enabled: false } } };

describe("CitationChip trigger", () => {
  it("renders a real button with a composed accessible name", () => {
    render(<CitationChip index={1} source={source} />);
    const chip = screen.getByRole("button", { name });
    expect(chip).toHaveAttribute("type", "button");
    expect(chip).toHaveAttribute("aria-expanded", "false");
    expect(chip).toHaveAttribute("aria-haspopup", "dialog");
    expect(chip).toHaveTextContent("1");
  });

  it("names the chip without an index when none is given", () => {
    render(<CitationChip source={{ id: "a", title: "Policy Handbook" }} />);
    expect(screen.getByRole("button", { name: "Citation: Policy Handbook" })).toBeInTheDocument();
  });

  it("falls back to a decorative dot when numeric has no index", () => {
    const { container } = render(<CitationChip source={source} />);
    const dot = container.querySelector("span[aria-hidden='true']");
    expect(dot).not.toBeNull();
    expect(screen.getByRole("button", { name: "Citation: Indian Penal Code, 1860 § 149" }))
      .toHaveTextContent("");
  });

  it.each([
    ["numeric", "1"],
    ["text", "§ 149"],
  ] as const)("renders the %s variant contents and data-variant", (variant, text) => {
    render(<CitationChip index={1} variant={variant} source={source} />);
    const chip = screen.getByRole("button", { name });
    expect(chip).toHaveAttribute("data-variant", variant);
    expect(chip).toHaveTextContent(text);
  });

  it("renders the dot variant as an aria-hidden shape with no text", () => {
    render(<CitationChip index={1} variant="dot" source={source} />);
    const chip = screen.getByRole("button", { name });
    expect(chip).toHaveAttribute("data-variant", "dot");
    expect(chip).toHaveTextContent("");
    expect(chip.querySelector("span")).toHaveAttribute("aria-hidden", "true");
  });

  it("lets `label` override the chip contents entirely", () => {
    render(<CitationChip index={1} label="ibid." source={source} />);
    expect(screen.getByRole("button", { name })).toHaveTextContent("ibid.");
  });

  it.each(["accent", "neutral"] as const)("applies the static class map for tone %s", (tone) => {
    render(<CitationChip index={1} tone={tone} source={source} />);
    const chip = screen.getByRole("button", { name });
    expect(chip).toHaveAttribute("data-tone", tone);
    expect(chip.className).toContain(tone === "accent" ? "bg-accent/12" : "bg-surface-sunken");
  });

  it("merges className last, spreads unknown props, and forwards its ref", () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<CitationChip ref={ref} index={1} source={source} className="px-8" title="hi" />);
    const chip = screen.getByRole("button", { name });
    expect(ref.current).toBe(chip);
    expect(chip).toHaveAttribute("title", "hi");
    expect(chip.className).toContain("px-8");
    expect(chip.className).not.toContain("px-1 ");
    expect(CitationChip.displayName).toBe("CitationChip");
  });

  it("renders the consumer's element as the trigger with asChild", () => {
    render(
      <CitationChip asChild source={source}>
        <a href="/corpus/ipc/149">source</a>
      </CitationChip>
    );
    const trigger = screen.getByRole("link", { name: "Citation: Indian Penal Code, 1860 § 149" });
    expect(trigger.tagName).toBe("A");
    expect(trigger).toHaveTextContent("source");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("CitationChip preview", () => {
  it("renders provenance as text, with the score bar hidden from AT", async () => {
    render(<CitationChip index={1} source={source} defaultOpen />);
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAccessibleName("Indian Penal Code, 1860");
    expect(dialog).toHaveTextContent("§ 149");
    expect(dialog).toHaveTextContent("92% relevance (fused)");
    expect(dialog).toHaveTextContent("from bm25 + InLegalBERT");
    expect(dialog).toHaveTextContent("Filed");
    expect(dialog).toHaveTextContent("1860-10-06");
    expect(screen.getByRole("link", { name: "Open source" })).toHaveAttribute(
      "href",
      "/corpus/ipc/149"
    );
    expect(dialog.querySelector("span[aria-hidden='true']")).not.toBeNull();
  });

  it("renders a snippet as a text node, never as markup", async () => {
    render(
      <CitationChip
        index={1}
        defaultOpen
        source={{ id: "x", title: "Corpus chunk", snippet: "<img src=x onerror=alert(1)>" }}
      />
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog.querySelector("img")).toBeNull();
    expect(dialog).toHaveTextContent("<img src=x onerror=alert(1)>");
  });

  it("clamps the score bar width and rounds the percentage", async () => {
    const { container } = render(
      <CitationChip index={1} defaultOpen source={{ id: "x", title: "T", score: 1.4 }} />
    );
    await screen.findByRole("dialog");
    const fill = container.ownerDocument.querySelector<HTMLElement>(".atlas-meter-fill");
    expect(fill?.style.getPropertyValue("--atlas-meter-fill")).toBe("100%");
    expect(screen.getByText("100% relevance")).toBeInTheDocument();
  });

  it("replaces the whole body with renderPreview", async () => {
    render(
      <CitationChip
        index={1}
        source={source}
        defaultOpen
        renderPreview={(s) => <p>custom {s.id}</p>}
      />
    );
    expect(await screen.findByText("custom sec-149")).toBeInTheDocument();
    expect(screen.queryByText(/relevance/)).toBeNull();
  });

  it("renders in place instead of a portal when portalContainer is null", async () => {
    const { container } = render(
      <CitationChip index={1} source={source} defaultOpen portalContainer={null} />
    );
    await waitFor(() => expect(container.querySelector("[role='dialog']")).not.toBeNull());
  });

  it("merges labels overrides over the English defaults", async () => {
    render(
      <CitationChip
        index={2}
        source={source}
        defaultOpen
        labels={{ citation: "Fundstelle", relevance: "Relevanz", from: "aus" }}
      />
    );
    expect(
      screen.getByRole("button", { name: "Fundstelle 2: Indian Penal Code, 1860 § 149" })
    ).toBeInTheDocument();
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("92% Relevanz (fused)");
    expect(dialog).toHaveTextContent("aus bm25 + InLegalBERT");
    expect(screen.getByRole("link", { name: "Open source" })).toBeInTheDocument();
  });
});

describe("CitationChip hover and focus", () => {
  it("opens after openDelayMs on hover and closes after closeDelayMs on leave", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <CitationChip
        index={1}
        source={source}
        openDelayMs={1}
        closeDelayMs={1}
        onOpenChange={onOpenChange}
      />
    );
    const chip = screen.getByRole("button", { name });

    await user.hover(chip);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.unhover(chip);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("never opens on hover when openOnHover is false", async () => {
    const user = userEvent.setup();
    render(<CitationChip index={1} source={source} openOnHover={false} openDelayMs={1} />);
    await user.hover(screen.getByRole("button", { name }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the card open along the safe path from chip to link", async () => {
    const user = userEvent.setup();
    render(<CitationChip index={1} source={source} openDelayMs={1} closeDelayMs={30} />);
    const chip = screen.getByRole("button", { name });

    await user.hover(chip);
    const dialog = await screen.findByRole("dialog");
    await user.unhover(chip);
    await user.hover(dialog);

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.unhover(dialog);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("opens on focus and does not close when the pointer leaves", async () => {
    const user = userEvent.setup();
    render(<CitationChip index={1} source={source} closeDelayMs={1} />);
    const chip = screen.getByRole("button", { name });

    await user.tab();
    expect(chip).toHaveFocus();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.unhover(chip);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.tab();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("completes the Tab -> Enter -> Escape path and returns focus to the chip", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<CitationChip index={1} source={source} onActivate={onActivate} />);
    const chip = screen.getByRole("button", { name });

    await user.tab();
    const dialog = await screen.findByRole("dialog");
    expect(chip).toHaveFocus();

    /* Enter pins the focus-opened preview instead of toggling it shut. */
    await user.keyboard("{Enter}");
    expect(onActivate).toHaveBeenCalledWith(source);
    expect(screen.getByRole("dialog")).toBe(dialog);
    await waitFor(() =>
      expect(dialog).toContainElement(document.activeElement as HTMLElement | null)
    );

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(chip).toHaveFocus();
  });

  it("closes a pinned preview on a second activation", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<CitationChip index={1} source={source} onActivate={onActivate} />);
    const chip = screen.getByRole("button", { name });

    await user.click(chip);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(chip);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it("stays controlled when `open` is supplied, reporting every request", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <CitationChip index={1} source={source} open={false} onOpenChange={onOpenChange} openDelayMs={1} />
    );
    const chip = screen.getByRole("button", { name });

    await user.hover(chip);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(true));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("CitationChip axe", () => {
  it("has no violations closed", async () => {
    const { container } = render(<CitationChip index={1} source={source} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each(["numeric", "dot", "text"] as const)("has no violations for variant %s", async (variant) => {
    const { container } = render(<CitationChip index={1} variant={variant} source={source} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no violations with the preview open", async () => {
    const { baseElement } = render(<CitationChip index={1} source={source} defaultOpen />);
    await screen.findByRole("dialog");
    expect(await axe(baseElement, pageAxeOptions)).toHaveNoViolations();
  });

  it("has no violations with the preview open inside prose", async () => {
    const { baseElement } = render(
      <p>
        A common object requires shared intent
        <CitationChip index={1} source={source} defaultOpen tone="neutral" />, not mere presence.
      </p>
    );
    await screen.findByRole("dialog");
    expect(await axe(baseElement, pageAxeOptions)).toHaveNoViolations();
  });
});
