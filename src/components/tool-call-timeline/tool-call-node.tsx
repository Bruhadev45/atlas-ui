import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cn } from "../../lib/cn";
import { formatDuration } from "../../lib/format";
import { safeStringify } from "../../lib/safe-json";
import type { Density } from "../../types";
import { callDuration, countDescendants, spellDuration } from "./duration";
import { StatusIcon, statusToneClass } from "./tool-call-status";
import type { ToolCall, ToolCallTimelineLabels, ToolCallTimelineProps } from "./tool-call-timeline.types";

/* Static lookup maps only (SPEC section 4.3). */

const rowDensityClass: Record<Density, string> = {
  compact: "gap-1.5 px-1.5 py-1 text-xs",
  comfortable: "gap-2 px-2 py-1.5 text-sm",
};

const triggerClass =
  "flex w-full items-center rounded-sm text-left font-medium text-fg hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface";

const codeClass =
  "m-0 max-h-64 overflow-x-auto overflow-y-auto rounded-sm bg-surface-sunken p-2 font-mono text-xs leading-relaxed text-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const linkButtonClass =
  "self-start rounded-sm text-xs font-medium text-accent underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface";

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

/** Everything the recursion carries unchanged from the root component. */
export interface ToolCallNodeContext {
  expandedIds: readonly string[];
  selectedId?: string;
  maxDepth: number;
  density: Density;
  showDurations: boolean;
  redactKeys: readonly string[];
  maxSerializedChars: number;
  renderArgs?: ToolCallTimelineProps["renderArgs"];
  renderResult?: ToolCallTimelineProps["renderResult"];
  labels: ToolCallTimelineLabels;
  onToggle: (id: string, open: boolean) => void;
  onSelect?: (call: ToolCall) => void;
  onRaiseDepth: () => void;
}

interface SerializedBlockProps {
  value: unknown;
  redactKeys: readonly string[];
  maxChars: number;
  showMoreLabel: string;
}

function SerializedBlock(props: SerializedBlockProps): React.JSX.Element {
  const { value, redactKeys, maxChars, showMoreLabel } = props;
  const [full, setFull] = React.useState(false);
  const { text, truncated } = safeStringify(value, {
    redactKeys,
    maxChars: full ? Number.MAX_SAFE_INTEGER : maxChars,
  });

  return (
    <>
      {/* A scrollable region must be reachable by keyboard (WCAG 2.1.1). */}
      <pre tabIndex={0} className={codeClass}>
        {text}
      </pre>
      {truncated && (
        <button type="button" className={linkButtonClass} onClick={() => setFull(true)}>
          {showMoreLabel}
        </button>
      )}
    </>
  );
}

function Section(props: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-1">
      <p className="m-0 text-xs font-medium uppercase tracking-wide text-fg-subtle">{props.title}</p>
      {props.children}
    </div>
  );
}

export interface ToolCallNodeProps {
  call: ToolCall;
  /** Root calls are depth 0. */
  depth: number;
  parentId?: string;
  ctx: ToolCallNodeContext;
}

export function ToolCallNode(props: ToolCallNodeProps): React.JSX.Element {
  const { call, depth, parentId, ctx } = props;
  const { labels } = ctx;
  const triggerId = React.useId();

  const expanded = ctx.expandedIds.includes(call.id);
  const selected = ctx.selectedId === call.id;
  const children = call.children ?? [];
  const foldChildren = children.length > 0 && depth + 1 >= ctx.maxDepth;

  /* `undefined` from a custom renderer means "fall back to the default one"
     (SPEC section 5.4 usage 3); `null` means "render nothing". */
  const customArgs = ctx.renderArgs?.(call);
  const customResult = ctx.renderResult?.(call);
  const argsNode =
    customArgs !== undefined ? (
      customArgs
    ) : call.args !== undefined ? (
      <SerializedBlock
        value={call.args}
        redactKeys={ctx.redactKeys}
        maxChars={ctx.maxSerializedChars}
        showMoreLabel={labels.showMore}
      />
    ) : null;
  const resultNode =
    customResult !== undefined ? (
      customResult
    ) : call.result !== undefined ? (
      <SerializedBlock
        value={call.result}
        redactKeys={ctx.redactKeys}
        maxChars={ctx.maxSerializedChars}
        showMoreLabel={labels.showMore}
      />
    ) : null;

  const hasPanel =
    argsNode != null || resultNode != null || call.error !== undefined || children.length > 0;
  const interactive = hasPanel || ctx.onSelect !== undefined;

  const ms = ctx.showDurations ? callDuration(call) : undefined;
  const srName = `, ${labels.statuses[call.status]}${ms === undefined ? "" : `, ${spellDuration(ms)}`}`;

  const rowInner = (
    <>
      {hasPanel && <ChevronIcon />}
      <span className={cn("flex shrink-0 items-center", statusToneClass[call.status])}>
        <StatusIcon status={call.status} />
      </span>
      <span className="min-w-0 truncate">{call.name}</span>
      <span className="sr-only">{srName}</span>
      {ms !== undefined && (
        <span aria-hidden="true" className="ml-auto shrink-0 pl-2 text-xs tabular-nums text-fg-subtle">
          {formatDuration(ms)}
        </span>
      )}
    </>
  );

  const row = interactive ? (
    <button
      type="button"
      id={triggerId}
      data-atlas-row={call.id}
      data-atlas-parent={parentId}
      aria-current={selected ? "true" : undefined}
      title={hasPanel ? (expanded ? labels.collapse : labels.expand) : undefined}
      className={cn(triggerClass, rowDensityClass[ctx.density])}
      onClick={() => ctx.onSelect?.(call)}
    >
      {rowInner}
    </button>
  ) : (
    <p className={cn("m-0 flex w-full items-center font-medium text-fg", rowDensityClass[ctx.density])}>
      {rowInner}
    </p>
  );

  const panel = (
    <div className="flex flex-col gap-2 py-1 pl-2">
      {argsNode != null && <Section title={labels.args}>{argsNode}</Section>}
      {resultNode != null && <Section title={labels.result}>{resultNode}</Section>}
      {call.error !== undefined && (
        <Section title={labels.error}>
          <p className="m-0 text-xs leading-relaxed text-danger">{call.error}</p>
        </Section>
      )}
      {children.length > 0 && (
        <ol role="list" className="m-0 flex list-none flex-col gap-0.5 border-l border-border p-0 pl-2">
          {foldChildren ? (
            <li>
              {/* Never a dead end: the fold row raises maxDepth locally. */}
              <button type="button" className={cn(linkButtonClass, "px-1 py-1")} onClick={ctx.onRaiseDepth}>
                {countDescendants(children)} {labels.nested}
              </button>
            </li>
          ) : (
            children.map((child) => (
              <ToolCallNode key={child.id} call={child} depth={depth + 1} parentId={call.id} ctx={ctx} />
            ))
          )}
        </ol>
      )}
    </div>
  );

  return (
    <li
      data-status={call.status}
      aria-busy={call.status === "running" || undefined}
      className={cn("rounded-sm", selected && "bg-accent/10 ring-1 ring-accent/30")}
    >
      {hasPanel ? (
        <CollapsiblePrimitive.Root
          open={expanded}
          onOpenChange={(open) => ctx.onToggle(call.id, open)}
        >
          <CollapsiblePrimitive.Trigger asChild>{row}</CollapsiblePrimitive.Trigger>
          <CollapsiblePrimitive.Content
            role="group"
            aria-labelledby={triggerId}
            className="atlas-collapse overflow-hidden"
          >
            {panel}
          </CollapsiblePrimitive.Content>
        </CollapsiblePrimitive.Root>
      ) : (
        row
      )}
    </li>
  );
}
