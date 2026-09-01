import type * as React from "react";
import type { Density } from "../../types";

export type ToolCallStatus = "pending" | "running" | "ok" | "error" | "cancelled";

export interface ToolCall {
  id: string;
  name: string;
  status: ToolCallStatus;
  /** Serialised safely; see `redactKeys`. */
  args?: unknown;
  result?: unknown;
  /** Human-readable failure message. Shown verbatim. */
  error?: string;
  /** Epoch ms. */
  startedAt?: number;
  endedAt?: number;
  /** Explicit duration wins over `endedAt - startedAt`. */
  durationMs?: number;
  children?: readonly ToolCall[];
  meta?: Record<string, unknown>;
}

export interface ToolCallTimelineLabels {
  args: string; // "Arguments"
  result: string; // "Result"
  error: string; // "Error"
  empty: string; // "No tool calls"
  statuses: Record<ToolCallStatus, string>;
  expand: string; // "Expand"
  collapse: string; // "Collapse"
  /**
   * Suffix of the fold row past `maxDepth`: "3 more nested calls".
   * Extends SPEC section 5.4's label set, which names the two controls its
   * accessibility contract requires (the fold row and the truncation control)
   * without giving them label keys. Every string the component renders stays
   * translatable.
   */
  nested: string; // "more nested calls"
  showMore: string; // "Show the full value"
}

export interface ToolCallTimelineProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  calls: readonly ToolCall[];

  /** Controlled expansion. */
  expandedIds?: readonly string[];
  /** Uncontrolled initial expansion. @default [] */
  defaultExpandedIds?: readonly string[];
  onExpandedChange?: (ids: string[]) => void;
  /** Expand everything initially (uncontrolled only). @default false */
  defaultExpandAll?: boolean;
  /** Auto-expand nodes that enter "running". @default true */
  autoExpandRunning?: boolean;

  /** Nesting depth rendered; deeper children collapse into a count. @default 4 */
  maxDepth?: number;
  /** @default "comfortable" */
  density?: Density;
  /** @default true */
  showDurations?: boolean;

  /**
   * Object keys whose values are replaced with "[redacted]", *added to*
   * `DEFAULT_REDACT_KEYS` rather than replacing them, so widening the list
   * cannot silently drop `apiKey` or `authorization`. Passing `[]` disables
   * redaction outright — the explicit act SPEC section 5.4 asks for.
   */
  redactKeys?: readonly string[];
  /** Cap on serialised arg/result characters before a "show more" control. @default 2000 */
  maxSerializedChars?: number;

  renderArgs?: (call: ToolCall) => React.ReactNode;
  renderResult?: (call: ToolCall) => React.ReactNode;

  selectedId?: string;
  /** Reported when a row is activated. Controlled-only. */
  onSelect?: (call: ToolCall) => void;

  /** Announce status transitions in a polite live region. @default false */
  announceStatusChanges?: boolean;

  emptyState?: React.ReactNode;
  labels?: Partial<ToolCallTimelineLabels>;
}
