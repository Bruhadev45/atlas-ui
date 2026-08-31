import type * as React from "react";
import { cn } from "../../lib/cn";
import type { CSSVars } from "../../types";
import { formatWeight } from "./format-score";
import { FALLBACK_COLOR, type ResolvedRetriever } from "./retrievers";
import type { RetrievalTraceLabels, RetrieverContribution } from "./retrieval-trace.types";

/* One class string for both the legend and the per-chunk badges: colour is a
   redundant reinforcement of text that already says everything (SPEC 5.6). */
const badgeClass =
  "inline-flex items-center rounded-sm border border-[hsl(var(--atlas-retriever))]/40 bg-[hsl(var(--atlas-retriever))]/10 px-1.5 py-px text-[0.6875rem] leading-4 text-[hsl(var(--atlas-retriever))]";

function colorVars(color: string): CSSVars {
  /* A colour unknowable at build time, as a custom property (SPEC 4.4). */
  return { "--atlas-retriever": color };
}

export interface RetrieverLegendProps {
  id: string;
  retrievers: readonly ResolvedRetriever[];
  labels: RetrievalTraceLabels;
}

/**
 * The legend precedes the list and is referenced by the `<ol>`'s
 * `aria-describedby`, so a screen-reader user meets the retriever names and
 * weights before the per-chunk badges start abbreviating them.
 */
export function RetrieverLegend(props: RetrieverLegendProps): React.JSX.Element {
  const { id, retrievers, labels } = props;
  return (
    <ul id={id} className="flex flex-wrap items-center gap-1.5">
      {retrievers.map((retriever) => (
        <li key={retriever.name}>
          <span className={badgeClass} style={colorVars(retriever.color)}>
            {retriever.label}
            {retriever.weight != null && ` · ${labels.weight} ${formatWeight(retriever.weight)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface ContributionBadgeProps {
  contribution: RetrieverContribution;
  retriever: ResolvedRetriever | undefined;
  labels: RetrievalTraceLabels;
  className?: string;
}

/**
 * `"bm25 · rank 1 · w 0.6"` — provenance as text first. `rank` is stored
 * zero-indexed (ragfuse's convention) and displayed one-indexed, matching the
 * rank pill beside it.
 */
export function ContributionBadge(props: ContributionBadgeProps): React.JSX.Element {
  const { contribution, retriever, labels, className } = props;
  const color = retriever?.color ?? FALLBACK_COLOR;
  return (
    <span className={cn(badgeClass, "tabular-nums", className)} style={colorVars(color)}>
      {retriever?.label ?? contribution.source} · {labels.rank} {contribution.rank + 1} ·{" "}
      {labels.weight} {formatWeight(contribution.weight)}
    </span>
  );
}
