import * as React from "react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { ChunkRow } from "./chunk-row";
import { queryTerms } from "./highlight";
import { RetrieverLegend } from "./provenance";
import { resolveRetrievers } from "./retrievers";
import type { RetrievalTraceLabels, RetrievalTraceProps } from "./retrieval-trace.types";

const defaultLabels: RetrievalTraceLabels = {
  rank: "rank",
  score: "Fused score",
  retrievedBy: "Retrieved by",
  weight: "w",
  empty: "No chunks retrieved",
  expand: "Expand chunk",
  collapse: "Collapse chunk",
  openSource: "Open source",
};

/* Stable identities: a fresh [] every render would restart useMemo and, for
   the uncontrolled default, look like a new defaultProp. */
const NO_KEYS: readonly string[] = [];
const NO_TERMS: readonly string[] = [];

export const RetrievalTrace = React.forwardRef<HTMLDivElement, RetrievalTraceProps>(
  (props, ref) => {
    const {
      chunks,
      retrievers: retrieversProp,
      query,
      expandedKeys,
      defaultExpandedKeys = NO_KEYS,
      onExpandedChange,
      selectedKey,
      onSelect,
      highlightQueryTerms = false,
      showProvenance = true,
      scoreDisplay = "normalized",
      maxSnippetChars = 320,
      density = "comfortable",
      renderChunk,
      emptyState,
      labels: labelsProp,
      className,
      ...rest
    } = props;

    const labels: RetrievalTraceLabels = { ...defaultLabels, ...labelsProp };
    const legendId = React.useId();

    const [expanded, setExpanded] = useControllableState<readonly string[]>({
      prop: expandedKeys,
      defaultProp: defaultExpandedKeys,
      onChange: (keys) => onExpandedChange?.([...keys]),
    });

    /* Always a new array, never a splice: the controlled consumer diffs it. */
    const toggle = React.useCallback(
      (key: string) => {
        setExpanded((prev) =>
          prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
      },
      [setExpanded]
    );

    const retrievers = React.useMemo(
      () => resolveRetrievers(chunks, retrieversProp),
      [chunks, retrieversProp]
    );
    const legend = React.useMemo(() => [...retrievers.values()], [retrievers]);

    const terms = React.useMemo(
      () => (highlightQueryTerms && query ? queryTerms(query) : NO_TERMS),
      [highlightQueryTerms, query]
    );

    /* `normalizedScore` is optional in the wire format, so derive it the way
       ragfuse does — against the top hit — rather than dropping the bar. */
    const topScore = React.useMemo(
      () => chunks.reduce((max, chunk) => Math.max(max, chunk.score), 0),
      [chunks]
    );

    const showLegend = showProvenance && legend.length > 0;

    return (
      <div
        ref={ref}
        {...rest}
        data-density={density}
        className={cn("flex flex-col gap-2", className)}
      >
        {query && (
          <p className="m-0 text-xs leading-snug text-fg-muted">
            <span className="sr-only">Query: </span>
            {query}
          </p>
        )}

        {showLegend && <RetrieverLegend id={legendId} retrievers={legend} labels={labels} />}

        {chunks.length === 0 ? (
          (emptyState ?? <p className="m-0 text-sm text-fg-subtle">{labels.empty}</p>)
        ) : (
          <ol
            /* Explicit role: Safari + VoiceOver drop list semantics when
               list-style is none, which would discard the ranking. */
            role="list"
            aria-describedby={showLegend ? legendId : undefined}
            className="m-0 flex list-none flex-col gap-2 p-0"
          >
            {chunks.map((chunk, index) => (
              <ChunkRow
                key={chunk.key}
                chunk={chunk}
                rank={index + 1}
                normalized={
                  chunk.normalizedScore ?? (topScore > 0 ? chunk.score / topScore : 0)
                }
                expanded={expanded.includes(chunk.key)}
                selected={selectedKey === chunk.key}
                density={density}
                showProvenance={showProvenance}
                scoreDisplay={scoreDisplay}
                maxSnippetChars={maxSnippetChars}
                terms={terms}
                retrievers={retrievers}
                labels={labels}
                renderChunk={renderChunk}
                onToggle={toggle}
                onSelect={onSelect}
              />
            ))}
          </ol>
        )}
      </div>
    );
  }
);

RetrievalTrace.displayName = "RetrievalTrace";
