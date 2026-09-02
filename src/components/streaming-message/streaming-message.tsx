import * as React from "react";
import { cn } from "../../lib/cn";
import { lastSentenceEnd } from "./announce";
import { completePartialMarkdown } from "./partial-markdown";
import { StreamActions } from "./stream-actions";
import { StreamCursor } from "./stream-cursor";
import type {
  StreamStatus,
  StreamingMessageLabels,
  StreamingMessageProps,
} from "./streaming-message.types";

const defaultLabels: StreamingMessageLabels = {
  stop: "Stop generating",
  regenerate: "Regenerate response",
  streaming: "Generating response",
  stopped: "Generation stopped",
  error: "Generation failed",
  actions: "Response actions",
};

/**
 * A render-rate limiter, never a source of truth: while streaming it returns a
 * trailing snapshot of `content` at most every `throttleMs`, and the moment
 * the status leaves `"streaming"` it returns `content` itself, so the final
 * text is always exact (SPEC section 5.1).
 */
function useThrottledContent(content: string, streaming: boolean, throttleMs: number): string {
  const [snapshot, setSnapshot] = React.useState(content);
  const contentRef = React.useRef(content);
  contentRef.current = content;
  const flushedAtRef = React.useRef(0);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = throttleMs > 0 && streaming;

  React.useEffect(() => {
    if (!active) return;
    const elapsed = Date.now() - flushedAtRef.current;
    if (elapsed >= throttleMs) {
      flushedAtRef.current = Date.now();
      setSnapshot(contentRef.current);
      return;
    }
    if (timerRef.current !== null) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushedAtRef.current = Date.now();
      setSnapshot(contentRef.current);
    }, throttleMs - elapsed);
  }, [content, active, throttleMs]);

  React.useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    []
  );

  return active ? snapshot : content;
}

/**
 * The announcement is deliberately decoupled from the text container: marking
 * the token stream itself `aria-live` makes a screen reader re-read the whole
 * growing paragraph on every chunk (SPEC section 5.1).
 */
function useAnnouncement(
  content: string,
  status: StreamStatus,
  announce: "off" | "polite",
  announceOn: "complete" | "sentence",
  labels: StreamingMessageLabels
): string {
  const [announcement, setAnnouncement] = React.useState("");
  const spokenToRef = React.useRef(0);
  const previousStatusRef = React.useRef(status);
  const labelsRef = React.useRef(labels);
  labelsRef.current = labels;

  React.useEffect(() => {
    const previous = previousStatusRef.current;
    previousStatusRef.current = status;
    if (announce === "off") return;

    if (status !== previous) {
      /* Stopped and errored always announce: they are the transitions a reader
         cannot infer from silence. */
      if (status === "stopped") {
        setAnnouncement(labelsRef.current.stopped);
        return;
      }
      if (status === "error") {
        setAnnouncement(labelsRef.current.error);
        return;
      }
      if (status === "streaming") {
        spokenToRef.current = 0;
        setAnnouncement("");
        return;
      }
      if (status === "complete") {
        setAnnouncement(content.slice(announceOn === "sentence" ? spokenToRef.current : 0));
        spokenToRef.current = content.length;
        return;
      }
    }

    if (status === "streaming" && announceOn === "sentence") {
      const boundary = lastSentenceEnd(content, spokenToRef.current);
      if (boundary > spokenToRef.current) {
        setAnnouncement(content.slice(spokenToRef.current, boundary));
        spokenToRef.current = boundary;
      }
    }
  }, [content, status, announce, announceOn]);

  return announcement;
}

export const StreamingMessage = React.forwardRef<HTMLDivElement, StreamingMessageProps>(
  (props, ref) => {
    const {
      content,
      status = "complete",
      renderContent,
      cursor = true,
      repairPartialMarkdown = true,
      throttleMs = 0,
      onStop,
      onRegenerate,
      error,
      actions,
      announce = "polite",
      announceOn = "complete",
      labels: labelsProp,
      className,
      ...rest
    } = props;

    const labels: StreamingMessageLabels = { ...defaultLabels, ...labelsProp };
    const isStreaming = status === "streaming";

    const shown = useThrottledContent(content, isStreaming, throttleMs);
    const announcement = useAnnouncement(content, status, announce, announceOn, labels);

    /* Safe on finished text too: a balanced document is a fixed point of the
       repair, so the pass does not need to know whether more is coming. */
    const text = repairPartialMarkdown ? completePartialMarkdown(shown) : shown;
    const showError = status === "error" && error !== undefined;
    const hasControls =
      onStop !== undefined || onRegenerate !== undefined || actions !== undefined;

    return (
      <div
        ref={ref}
        {...rest}
        /* No role: the component cannot know whether it is one message among
           many, so the thread wrapper stays the consumer's call. */
        data-status={status}
        aria-busy={isStreaming}
        className={cn("text-fg leading-relaxed", className)}
      >
        {showError ? (
          <div className="rounded border border-danger/30 bg-danger/8 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        ) : (
          <>
            {renderContent ? (
              renderContent(text, { status, isPartial: isStreaming })
            ) : (
              <span className="whitespace-pre-wrap break-words">{text}</span>
            )}
            {isStreaming && cursor !== false && <StreamCursor cursor={cursor} />}
          </>
        )}

        {hasControls && (
          <StreamActions
            status={status}
            labels={labels}
            onStop={onStop}
            onRegenerate={onRegenerate}
            actions={actions}
          />
        )}

        {announce !== "off" && (
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </div>
        )}
      </div>
    );
  }
);

StreamingMessage.displayName = "StreamingMessage";
