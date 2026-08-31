import type * as React from "react";
import type { Align, Side } from "../../types";

export interface CitationSource {
  id: string;
  title: string;
  /** Quoted passage. Rendered as text; never parsed as HTML. */
  snippet?: string;
  url?: string;
  /** Relevance in 0..1. Rendered as a percentage plus a decorative bar. */
  score?: number;
  /** What `score` measures, e.g. "fused", "cosine", "bm25". */
  scoreLabel?: string;
  /** Human pin-cite: "§ 149(2)", "10-K p. 31", "Policy 4.2". */
  locator?: string;
  /** Which retriever surfaced this source. */
  retriever?: string;
  /** Extra rows in the preview footer, rendered as key/value text. */
  meta?: Record<string, string>;
}

export interface CitationChipLabels {
  citation: string; // "Citation"
  relevance: string; // "relevance"
  openSource: string; // "Open source"
  from: string; // "from"
}

export interface CitationChipProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "children" | "onClick" | "type"
  > {
  source: CitationSource;
  /** Number shown in the chip. Falls back to `label`, then to a dot. */
  index?: number;
  /** Overrides chip contents entirely. */
  label?: React.ReactNode;

  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial state. @default false */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** Open the preview on pointer hover in addition to focus. @default true */
  openOnHover?: boolean;
  /** @default 120 */
  openDelayMs?: number;
  /** @default 160 */
  closeDelayMs?: number;

  /** @default "numeric" */
  variant?: "numeric" | "dot" | "text";
  /** @default "accent" */
  tone?: "neutral" | "accent";

  /** Click-through, e.g. scroll the document viewer to this passage. */
  onActivate?: (source: CitationSource) => void;
  /** Replace the whole preview body. */
  renderPreview?: (source: CitationSource) => React.ReactNode;

  /** @default "top" */
  side?: Side;
  /** @default "center" */
  align?: Align;
  /** Portal target. `null` renders in place (use inside an existing portal). */
  portalContainer?: HTMLElement | null;

  /** Render the trigger as the single child element (Radix Slot). @default false */
  asChild?: boolean;
  children?: React.ReactNode;

  labels?: Partial<CitationChipLabels>;
  className?: string;
  previewClassName?: string;
}

export declare const CitationChip: React.ForwardRefExoticComponent<
  CitationChipProps & React.RefAttributes<HTMLButtonElement>
>;
