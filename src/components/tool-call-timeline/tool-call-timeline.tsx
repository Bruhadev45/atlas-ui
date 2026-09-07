import * as React from "react";
import { cn } from "../../lib/cn";
import { DEFAULT_REDACT_KEYS } from "../../lib/safe-json";
import { useControllableState } from "../../hooks/use-controllable-state";
import { flattenCalls } from "./duration";
import { ToolCallNode, type ToolCallNodeContext } from "./tool-call-node";
import type {
  ToolCallStatus,
  ToolCallTimelineLabels,
  ToolCallTimelineProps,
} from "./tool-call-timeline.types";

const defaultLabels: ToolCallTimelineLabels = {
  args: "Arguments",
  result: "Result",
  error: "Error",
  empty: "No tool calls",
  statuses: {
    pending: "Pending",
    running: "Running",
    ok: "Succeeded",
    error: "Failed",
    cancelled: "Cancelled",
  },
  expand: "Expand",
  collapse: "Collapse",
  nested: "more nested calls",
  showMore: "Show the full value",
};

/* A fresh [] every render would look like a new defaultProp. */
const NO_IDS: readonly string[] = [];

const ROW_SELECTOR = "[data-atlas-row]";

export const ToolCallTimeline = React.forwardRef<HTMLDivElement, ToolCallTimelineProps>(
  (props, ref) => {
    const {
      calls,
      expandedIds,
      defaultExpandedIds = NO_IDS,
      onExpandedChange,
      defaultExpandAll = false,
      autoExpandRunning = true,
      maxDepth = 4,
      density = "comfortable",
      showDurations = true,
      redactKeys,
      maxSerializedChars = 2000,
      renderArgs,
      renderResult,
      selectedId,
      onSelect,
      announceStatusChanges = false,
      emptyState,
      labels: labelsProp,
      className,
      onKeyDown: onKeyDownProp,
      ...rest
    } = props;

    const labels: ToolCallTimelineLabels = {
      ...defaultLabels,
      ...labelsProp,
      statuses: { ...defaultLabels.statuses, ...labelsProp?.statuses },
    };

    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    /* Uncontrolled only, and read once: `defaultExpandAll` describes the
       initial render, not an invariant to re-apply as calls arrive. */
    const [initialExpanded] = React.useState<readonly string[]>(() =>
      defaultExpandAll ? flattenCalls(calls).map((call) => call.id) : defaultExpandedIds
    );

    const [expanded, setExpanded] = useControllableState<readonly string[]>({
      prop: expandedIds,
      defaultProp: initialExpanded,
      onChange: (ids) => onExpandedChange?.([...ids]),
    });

    /* Always a new array, never a splice: the controlled consumer diffs it. */
    const setOpen = React.useCallback(
      (id: string, open: boolean) => {
        setExpanded((prev) => {
          if (open) return prev.includes(id) ? prev : [...prev, id];
          return prev.includes(id) ? prev.filter((other) => other !== id) : prev;
        });
      },
      [setExpanded]
    );

    /* The fold row past `maxDepth` raises the depth for this instance only. */
    const [extraDepth, setExtraDepth] = React.useState(0);
    const raiseDepth = React.useCallback(() => setExtraDepth((depth) => depth + 1), []);

    const [announcement, setAnnouncement] = React.useState("");
    const statusesRef = React.useRef(new Map<string, ToolCallStatus>());
    const mountedRef = React.useRef(false);
    const labelsRef = React.useRef(labels);
    labelsRef.current = labels;

    React.useEffect(() => {
      const previous = statusesRef.current;
      const next = new Map<string, ToolCallStatus>();
      const changed: string[] = [];
      const entered: string[] = [];

      for (const call of flattenCalls(calls)) {
        next.set(call.id, call.status);
        if (previous.get(call.id) === call.status) continue;
        changed.push(`${call.name}: ${labelsRef.current.statuses[call.status]}`);
        if (call.status === "running") entered.push(call.id);
      }
      statusesRef.current = next;

      /* Only ever written through the state setter, so a controlled consumer
         sees it as an onExpandedChange it can decline (SPEC section 5.4). */
      if (autoExpandRunning && entered.length > 0) {
        setExpanded((prev) => {
          const missing = entered.filter((id) => !prev.includes(id));
          return missing.length === 0 ? prev : [...prev, ...missing];
        });
      }

      /* The first pass is the initial render, not a transition: announcing
         every call a trace mounts with would read the whole list aloud. */
      if (announceStatusChanges && mountedRef.current && changed.length > 0) {
        setAnnouncement(changed.join(", "));
      }
      mountedRef.current = true;
    }, [calls, autoExpandRunning, announceStatusChanges, setExpanded]);

    /**
     * Additive, non-trapping shortcuts (ADR-003): they act only when a row
     * button itself has focus, so text selection and scrolling inside an open
     * panel are untouched, and Tab order stays native.
     */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDownProp?.(event);
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      const row = event.target as HTMLElement;
      const root = rootRef.current;
      if (!root || !row.matches?.(ROW_SELECTOR)) return;

      const rows = Array.from(root.querySelectorAll<HTMLElement>(ROW_SELECTOR));
      const expandedState = row.getAttribute("aria-expanded");
      const id = row.dataset.atlasRow;

      const focus = (target: HTMLElement | undefined): boolean => {
        if (!target) return false;
        target.focus();
        return true;
      };

      let handled = false;
      switch (event.key) {
        case "ArrowRight":
          if (expandedState === "false" && id) {
            setOpen(id, true);
            handled = true;
          } else if (expandedState === "true") {
            handled = focus(rows.find((other) => other.dataset.atlasParent === id));
          }
          break;
        case "ArrowLeft":
          if (expandedState === "true" && id) {
            setOpen(id, false);
            handled = true;
          } else {
            const parent = row.dataset.atlasParent;
            handled = Boolean(
              parent && focus(rows.find((other) => other.dataset.atlasRow === parent))
            );
          }
          break;
        case "Home":
          handled = focus(rows[0]);
          break;
        case "End":
          handled = focus(rows[rows.length - 1]);
          break;
        default:
          break;
      }

      if (handled) event.preventDefault();
    };

    /* Widening, not replacing: a consumer adding "ssn" must not silently lose
       "apiKey". An explicit empty array is the documented opt-out. */
    const resolvedRedactKeys = React.useMemo(
      () =>
        redactKeys === undefined
          ? DEFAULT_REDACT_KEYS
          : redactKeys.length === 0
            ? redactKeys
            : [...new Set([...DEFAULT_REDACT_KEYS, ...redactKeys])],
      [redactKeys]
    );

    const ctx: ToolCallNodeContext = {
      expandedIds: expanded,
      selectedId,
      maxDepth: maxDepth + extraDepth,
      density,
      showDurations,
      redactKeys: resolvedRedactKeys,
      maxSerializedChars,
      renderArgs,
      renderResult,
      labels,
      onToggle: setOpen,
      onSelect,
      onRaiseDepth: raiseDepth,
    };

    return (
      <div
        ref={setRefs}
        {...rest}
        data-density={density}
        className={cn("flex flex-col gap-1", className)}
        onKeyDown={handleKeyDown}
      >
        {calls.length === 0 ? (
          (emptyState ?? <p className="m-0 text-sm text-fg-subtle">{labels.empty}</p>)
        ) : (
          <ol
            /* Ordered: execution order is meaningful. The explicit role is for
               Safari + VoiceOver, which drop list semantics when list-style
               is none. */
            role="list"
            className="m-0 flex list-none flex-col gap-0.5 p-0"
          >
            {calls.map((call) => (
              <ToolCallNode key={call.id} call={call} depth={0} ctx={ctx} />
            ))}
          </ol>
        )}

        {announceStatusChanges && (
          <div role="status" aria-live="polite" className="sr-only">
            {announcement}
          </div>
        )}
      </div>
    );
  }
);

ToolCallTimeline.displayName = "ToolCallTimeline";
