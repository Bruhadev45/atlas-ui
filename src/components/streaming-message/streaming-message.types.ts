import type * as React from "react";

export type StreamStatus = "idle" | "streaming" | "complete" | "stopped" | "error";

export interface StreamingMessageLabels {
  stop: string; // "Stop generating"
  regenerate: string; // "Regenerate response"
  streaming: string; // "Generating response"
  stopped: string; // "Generation stopped"
  error: string; // "Generation failed"
  /** Names the `role="group"` wrapper the controls live in (SPEC section 5.1). */
  actions: string; // "Response actions"
}

export interface StreamingRenderContext {
  status: StreamStatus;
  /** True while `status === "streaming"`; the text may end mid-token. */
  isPartial: boolean;
}

export interface StreamingMessageProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "content"> {
  /** The text received so far. Always fully controlled. */
  content: string;
  /** @default "complete" */
  status?: StreamStatus;
  /**
   * Renders `content` to React nodes. Receives text already repaired by
   * `completePartialMarkdown` when `repairPartialMarkdown` is on.
   * @default plain text in a whitespace-preserving block
   */
  renderContent?: (text: string, ctx: StreamingRenderContext) => React.ReactNode;
  /** Caret shown while streaming. `true` = default caret, or supply a node. @default true */
  cursor?: boolean | React.ReactNode;
  /** Close unterminated code fences and inline marks before rendering. @default true */
  repairPartialMarkdown?: boolean;
  /** Cap render rate for fast streams. 0 disables. Never changes final content. @default 0 */
  throttleMs?: number;
  /** Shown while streaming. Omit to hide the stop button. */
  onStop?: () => void;
  /** Shown on complete/stopped/error. Omit to hide the regenerate button. */
  onRegenerate?: () => void;
  /** Rendered in place of content when `status === "error"`. */
  error?: React.ReactNode;
  /** Extra affordances (copy, thumbs) rendered beside stop/regenerate. */
  actions?: React.ReactNode;
  /** Screen-reader announcement strategy. @default "polite" */
  announce?: "off" | "polite";
  /** What to announce. @default "complete" */
  announceOn?: "complete" | "sentence";
  labels?: Partial<StreamingMessageLabels>;
}
