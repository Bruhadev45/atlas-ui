import * as React from "react";
import { cn } from "../../lib/cn";
import type { ComposerAttachment, ComposerLabels } from "./assistant-composer.types";

const UNITS = ["B", "kB", "MB", "GB"] as const;

/** Decimal units, matching how operating systems report file sizes. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
}

export function fill(template: string, token: string, value: string | number): string {
  return template.split(token).join(String(value));
}

export interface AttachmentChipProps {
  attachment: ComposerAttachment;
  labels: ComposerLabels;
  disabled?: boolean;
  onRemove?: (id: string) => void;
}

/**
 * One attachment. Failure is text plus a tone change, never a red border on its
 * own, so the state survives greyscale and a screen reader (SPEC section 5.7).
 */
export function AttachmentChip(props: AttachmentChipProps): React.ReactElement {
  const { attachment, labels, disabled, onRemove } = props;
  const status = attachment.status ?? "ready";
  const percent = Math.round((attachment.progress ?? 0) * 100);

  return (
    <li
      data-status={status}
      className={cn(
        "flex max-w-[16rem] items-center gap-2 rounded border border-border bg-surface-sunken px-2 py-1 text-xs text-fg-muted",
        status === "error" && "border-danger/30 text-danger"
      )}
    >
      {attachment.previewUrl !== undefined && (
        <img src={attachment.previewUrl} alt="" className="size-5 shrink-0 rounded object-cover" />
      )}

      <span className="truncate font-medium text-fg">{attachment.name}</span>

      {attachment.size !== undefined && (
        <span className="shrink-0 tabular-nums">{formatBytes(attachment.size)}</span>
      )}

      {status === "uploading" && (
        <span
          role="progressbar"
          aria-label={attachment.name}
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-border"
        >
          <span
            className="block h-full bg-accent"
            /* A width percentage is data, not a design decision (SPEC section 4.4). */
            style={{ width: `${percent}%` }}
          />
        </span>
      )}

      {status === "error" && attachment.error !== undefined && (
        <span className="shrink-0">{attachment.error}</span>
      )}

      {onRemove && (
        <button
          type="button"
          disabled={disabled}
          aria-label={fill(labels.removeAttachment, "{name}", attachment.name)}
          onClick={() => onRemove(attachment.id)}
          className="ml-auto shrink-0 rounded px-1 text-fg-subtle transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      )}
    </li>
  );
}
