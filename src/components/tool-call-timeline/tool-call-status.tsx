import type * as React from "react";
import type { ToolCallStatus } from "./tool-call-timeline.types";

/**
 * Five distinct shapes so status never depends on colour alone (WCAG 1.4.1):
 * dot (pending), spinner (running), check (ok), cross (error), slash
 * (cancelled). The spinner carries its own reduced-motion fallback — the
 * `.atlas-spinner` rules in tokens.css swap the rotating arc for the static
 * dot inside it, because a frozen arc reads as a broken glyph.
 */
const base = {
  viewBox: "0 0 16 16",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  focusable: "false",
  "aria-hidden": true,
  className: "h-3.5 w-3.5 shrink-0",
} as const;

const stroke = {
  stroke: "currentColor",
  strokeWidth: "1.75",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Status colours (SPEC section 5.4). Static lookup map, never composed. */
export const statusToneClass: Record<ToolCallStatus, string> = {
  pending: "text-fg-subtle",
  running: "text-info",
  ok: "text-success",
  error: "text-danger",
  cancelled: "text-fg-subtle",
};

function PendingIcon(): React.JSX.Element {
  return (
    <svg {...base}>
      <circle cx="8" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function RunningIcon(): React.JSX.Element {
  return (
    <svg {...base} className="atlas-spinner h-3.5 w-3.5 shrink-0">
      <path className="atlas-spinner-arc" d="M8 2a6 6 0 0 1 6 6" {...stroke} />
      <circle
        className="atlas-spinner-arc"
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeOpacity="0.25"
      />
      <circle className="atlas-spinner-dot" cx="8" cy="8" r="3.25" fill="currentColor" />
    </svg>
  );
}

function OkIcon(): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" {...stroke} />
    </svg>
  );
}

function ErrorIcon(): React.JSX.Element {
  return (
    <svg {...base}>
      <path d="M4 4l8 8M12 4l-8 8" {...stroke} />
    </svg>
  );
}

function CancelledIcon(): React.JSX.Element {
  return (
    <svg {...base}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.9 12.1 12.1 3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const icons: Record<ToolCallStatus, () => React.JSX.Element> = {
  pending: PendingIcon,
  running: RunningIcon,
  ok: OkIcon,
  error: ErrorIcon,
  cancelled: CancelledIcon,
};

export function StatusIcon({ status }: { status: ToolCallStatus }): React.JSX.Element {
  const Icon = icons[status];
  return <Icon />;
}
