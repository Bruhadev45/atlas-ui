import type * as React from "react";
import type { Density } from "../../types";

/** Mirrors ragfuse `Contribution`. */
export interface RetrieverContribution {
  /** Retriever name, e.g. "bm25" | "dense". */
  source: string;
  /** Zero-indexed position in that retriever's list. */
  rank: number;
  /** Weight applied during fusion. */
  weight: number;
  /** The weighted RRF term, weight / (k + rank + 1). */
  score: number;
}

/** Mirrors ragfuse `FusedHit`, plus display fields. */
export interface RetrievedChunk {
  /** Stable id the document was fused on (`FusedHit.key`). */
  key: string;
  /** Raw weighted RRF sum. */
  score: number;
  /** 0..1, relative to the top hit. Derived from the list when omitted. */
  normalizedScore?: number;
  contributions?: readonly RetrieverContribution[];

  title?: string;
  /** Chunk body. Rendered as text; never parsed as HTML. */
  text?: string;
  url?: string;
  locator?: string;
  meta?: Record<string, unknown>;
}

export interface RetrieverDescriptor {
  name: string;
  label?: string;
  /** Fusion weight, shown in the legend. */
  weight?: number;
  /**
   * HSL channel triplet (`"217 91% 62%"`) or a `var()` naming one. It is
   * interpolated into `hsl(var(--atlas-retriever) / <alpha>)`, which is what
   * lets the badge derive its border, text and background tints from one
   * value. Falls back to the `--atlas-retriever-N` token palette.
   */
  color?: string;
}

export interface RetrievalTraceLabels {
  rank: string; // "rank"
  score: string; // "Fused score"
  retrievedBy: string; // "Retrieved by"
  weight: string; // "w"
  empty: string; // "No chunks retrieved"
  expand: string;
  collapse: string;
  openSource: string; // "Open source"
}

export interface RetrievalTraceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  chunks: readonly RetrievedChunk[];
  /** Legend + colour assignment + weights. Inferred from contributions if omitted. */
  retrievers?: readonly RetrieverDescriptor[];
  /** Shown as a header and used for term highlighting. */
  query?: string;

  expandedKeys?: readonly string[];
  defaultExpandedKeys?: readonly string[];
  onExpandedChange?: (keys: string[]) => void;

  selectedKey?: string;
  /** Reported when a chunk's disclosure button is activated. Controlled-only. */
  onSelect?: (chunk: RetrievedChunk) => void;

  /** Wrap query terms in <mark>. Escaped, never innerHTML. @default false */
  highlightQueryTerms?: boolean;
  /** @default true */
  showProvenance?: boolean;
  /** @default "normalized" */
  scoreDisplay?: "normalized" | "raw" | "both";
  /** Collapsed snippet length. @default 320 */
  maxSnippetChars?: number;
  /** @default "comfortable" */
  density?: Density;

  /**
   * Replaces the default body (snippet / full text / meta) of a row. The
   * `<li>`, rank, disclosure button, score and provenance stay with the
   * library, so a custom row cannot drop the provenance contract.
   */
  renderChunk?: (
    chunk: RetrievedChunk,
    ctx: { rank: number; expanded: boolean; selected: boolean }
  ) => React.ReactNode;

  emptyState?: React.ReactNode;
  labels?: Partial<RetrievalTraceLabels>;
}
