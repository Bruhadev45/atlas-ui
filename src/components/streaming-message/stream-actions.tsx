import * as React from "react";
import type { StreamStatus, StreamingMessageLabels } from "./streaming-message.types";

const BUTTON_CLASS =
  "inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs text-fg-muted transition-colors hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface StreamActionsProps {
  status: StreamStatus;
  labels: StreamingMessageLabels;
  onStop?: () => void;
  onRegenerate?: () => void;
  actions?: React.ReactNode;
}

/**
 * Stop and regenerate never share an element and never swap in place: they are
 * two buttons in one stable group, so focus is not moved out from under the
 * reader when the stream ends (SPEC section 5.1).
 */
export function StreamActions(props: StreamActionsProps): React.ReactElement {
  const { status, labels, onStop, onRegenerate, actions } = props;
  const canRegenerate =
    status === "complete" || status === "stopped" || status === "error";

  return (
    <div role="group" aria-label={labels.actions} className="mt-2 flex flex-wrap items-center gap-2">
      {onStop && status === "streaming" && (
        <button type="button" className={BUTTON_CLASS} onClick={onStop}>
          {labels.stop}
        </button>
      )}
      {onRegenerate && canRegenerate && (
        <button type="button" className={BUTTON_CLASS} onClick={onRegenerate}>
          {labels.regenerate}
        </button>
      )}
      {actions}
    </div>
  );
}
