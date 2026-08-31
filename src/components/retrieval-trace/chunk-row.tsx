import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/clamp";
import type { CSSVars, Density } from "../../types";
import { formatNormalized, formatRawScore } from "./format-score";
import { highlightTerms } from "./highlight";
import { ContributionBadge } from "./provenance";
import type { ResolvedRetriever } from "./retrievers";
import type {
  RetrievalTraceLabels,
  RetrievalTraceProps,
  RetrievedChunk,
} from "./retrieval-trace.types";

/* Static lookup maps only (SPEC section 4.3). */

const rowDensityClass: Record<Density, string> = {
  compact: "gap-1 p-2 text-xs",
  comfortable: "gap-1.5 p-3 text-sm",
};

const rankPillClass =
  "mt-px inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-sm bg-surface-sunken px-1 text-xs font-medium tabular-nums text-fg-subtle";

const triggerClass =
  "flex w-full items-center gap-1.5 rounded-sm text-left font-medium text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

function ChevronIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
      className="h-3 w-3 shrink-0 text-fg-subtle transition-transform duration-atlas ease-atlas [[data-state=open]_&]:rotate-90"
    >
      <path
        d="m6 3.5 5 4.5-5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`;
}

function scoreText(
  chunk: RetrievedChunk,
  normalized: number,
  display: NonNullable<RetrievalTraceProps["scoreDisplay"]>
): string {
  if (display === "raw") return formatRawScore(chunk.score);
  const norm = formatNormalized(normalized);
  /* The raw sum alone is unreadable and the normalised score alone hides ties,
     so "both" prints one and qualifies it with the other (SPEC 5.6). */
  return display === "both" ? `${norm} (raw ${formatRawScore(chunk.score)})` : norm;
}

/** Only primitives render; a nested object would need HTML-ish formatting. */
function metaRows(meta: Record<string, unknown> | undefined): [string, string][] {
  if (!meta) return [];
  const rows: [string, string][] = [];
  for (const [key, value] of Object.entries(meta)) {
    if (value == null) continue;
    if (typeof value === "object" || typeof value === "function") continue;
    rows.push([key, String(value)]);
  }
  return rows;
}

export interface ChunkRowProps {
  chunk: RetrievedChunk;
  /** One-indexed position in the fused ranking. */
  rank: number;
  /** `chunk.normalizedScore`, or derived from the top hit when absent. */
  normalized: number;
  expanded: boolean;
  selected: boolean;
  density: Density;
  showProvenance: boolean;
  scoreDisplay: NonNullable<RetrievalTraceProps["scoreDisplay"]>;
  maxSnippetChars: number;
  terms: readonly string[];
  retrievers: ReadonlyMap<string, ResolvedRetriever>;
  labels: RetrievalTraceLabels;
  renderChunk?: RetrievalTraceProps["renderChunk"];
  onToggle: (key: string) => void;
  onSelect?: (chunk: RetrievedChunk) => void;
}

export function ChunkRow(props: ChunkRowProps): React.JSX.Element {
  const {
    chunk,
    rank,
    normalized,
    expanded,
    selected,
    density,
    showProvenance,
    scoreDisplay,
    maxSnippetChars,
    terms,
    retrievers,
    labels,
    renderChunk,
    onToggle,
    onSelect,
  } = props;

  const contributions = chunk.contributions ?? [];
  const barStyle: CSSVars = { "--atlas-meter-fill": `${clamp(normalized, 0, 1) * 100}%` };
  const meta = metaRows(chunk.meta);
  const title = chunk.title ?? chunk.locator ?? chunk.key;

  /* The default body is the collapsed preview only — the full text lives in
     the Collapsible. A custom body owns both states and gets `expanded` to
     tell them apart. */
  let body: React.ReactNode = null;
  if (renderChunk) body = renderChunk(chunk, { rank, expanded, selected });
  else if (!expanded && chunk.text) {
    body = (
      <p className="leading-relaxed text-fg-muted">
        {highlightTerms(truncate(chunk.text, maxSnippetChars), terms)}
      </p>
    );
  }

  return (
    <li
      data-selected={selected || undefined}
      className={cn(
        "flex flex-col rounded-lg border border-border bg-surface",
        rowDensityClass[density],
        selected && "ring-2 ring-accent/40"
      )}
    >
      <CollapsiblePrimitive.Root
        open={expanded}
        onOpenChange={() => onToggle(chunk.key)}
        className="flex flex-col gap-1.5"
      >
        <div className="flex items-start gap-2">
          <span data-rank={rank} className={rankPillClass}>
            {/* List numbering is not reliably announced in every mode, so the
                rank is real text, with the word spelled out for AT. */}
            <span className="sr-only">{labels.rank} </span>
            {rank}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <CollapsiblePrimitive.Trigger asChild>
              <button
                type="button"
                aria-current={selected ? "true" : undefined}
                title={expanded ? labels.collapse : labels.expand}
                className={triggerClass}
                onClick={() => onSelect?.(chunk)}
              >
                <ChevronIcon />
                <span className="min-w-0 truncate">{title}</span>
                {chunk.title && chunk.locator && (
                  <span className="shrink-0 text-xs font-normal text-fg-subtle">
                    {chunk.locator}
                  </span>
                )}
              </button>
            </CollapsiblePrimitive.Trigger>

            <p className="flex items-center gap-2 text-xs text-fg-subtle">
              <span className="tabular-nums">
                {labels.score} {scoreText(chunk, normalized, scoreDisplay)}
              </span>
              <span
                aria-hidden="true"
                className="h-1 w-16 overflow-hidden rounded-full bg-surface-sunken"
              >
                <span
                  className="atlas-meter-fill block h-full rounded-full bg-accent"
                  style={barStyle}
                />
              </span>
            </p>

            {showProvenance && contributions.length > 0 && (
              <p className="flex flex-wrap items-center gap-1">
                <span className="sr-only">{labels.retrievedBy}: </span>
                {contributions.map((contribution) => (
                  <ContributionBadge
                    key={`${contribution.source}-${contribution.rank}`}
                    contribution={contribution}
                    retriever={retrievers.get(contribution.source)}
                    labels={labels}
                  />
                ))}
              </p>
            )}
          </div>
        </div>

        {body}

        <CollapsiblePrimitive.Content className="atlas-collapse overflow-hidden">
          <div className="flex flex-col gap-1.5 pt-1.5">
            {!renderChunk && chunk.text && (
              /* Long chunks scroll rather than push the next hit off screen;
                 a scrollable region must be reachable by keyboard. */
              <div
                tabIndex={0}
                className="max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {highlightTerms(chunk.text, terms)}
              </div>
            )}
            {meta.length > 0 && (
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
                {meta.map(([key, value]) => (
                  <React.Fragment key={key}>
                    <dt className="text-fg-subtle">{key}</dt>
                    <dd className="truncate text-fg-muted">{value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            )}
            {chunk.url && (
              <a
                href={chunk.url}
                className="self-start text-xs font-medium text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {labels.openSource}
              </a>
            )}
          </div>
        </CollapsiblePrimitive.Content>
      </CollapsiblePrimitive.Root>
    </li>
  );
}
