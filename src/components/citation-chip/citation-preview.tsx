import type * as React from "react";
import { clamp } from "../../lib/clamp";
import type { CSSVars } from "../../types";
import type { CitationChipLabels, CitationSource } from "./citation-chip.types";

export interface CitationPreviewProps {
  source: CitationSource;
  labels: CitationChipLabels;
  headingId: string;
}

/**
 * The default preview body. Every field is a text node — retrieved chunks are
 * untrusted corpus content, so nothing here is ever parsed as HTML (SPEC
 * section 9). Replaceable wholesale via `renderPreview`.
 */
export function CitationPreview(props: CitationPreviewProps): React.JSX.Element {
  const { source, labels, headingId } = props;
  const { score, meta } = source;
  const pct = score == null ? null : Math.round(clamp(score, 0, 1) * 100);
  /* A geometric value as a custom property, not a generated class (SPEC 4.4). */
  const barStyle: CSSVars = { "--atlas-meter-fill": `${pct ?? 0}%` };
  const metaRows = meta ? Object.entries(meta) : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <p id={headingId} className="m-0 text-sm font-medium leading-snug text-fg">
          {source.title}
        </p>
        {source.locator && (
          <p className="m-0 text-xs leading-snug text-fg-muted">{source.locator}</p>
        )}
      </div>

      {source.snippet && (
        <p className="m-0 border-l-2 border-border pl-2 text-xs leading-relaxed text-fg-muted">
          {source.snippet}
        </p>
      )}

      {pct != null && (
        <div className="flex flex-col gap-1">
          <span className="text-xs tabular-nums text-fg-subtle">
            {pct}% {labels.relevance}
            {source.scoreLabel ? ` (${source.scoreLabel})` : ""}
          </span>
          <span
            aria-hidden="true"
            className="h-1 overflow-hidden rounded-full bg-surface-sunken"
          >
            <span
              className="atlas-meter-fill block h-full rounded-full bg-accent"
              style={barStyle}
            />
          </span>
        </div>
      )}

      {metaRows.length > 0 && (
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
          {metaRows.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-fg-subtle">{key}</dt>
              <dd className="m-0 text-fg-muted">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(source.retriever || source.url) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {source.retriever && (
            <span className="rounded-sm bg-surface-sunken px-1.5 py-0.5 text-xs text-fg-subtle">
              {labels.from} {source.retriever}
            </span>
          )}
          {source.url && (
            <a
              href={source.url}
              className="rounded-sm text-xs font-medium text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
            >
              {labels.openSource}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
