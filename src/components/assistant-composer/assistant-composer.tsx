import * as React from "react";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { useSlashCommands } from "../../hooks/use-slash-commands";
import { AttachmentChip, fill } from "./attachment-chip";
import { CommandMenu } from "./command-menu";
import { validateFiles } from "./file-validation";
import { useAutosize } from "./use-autosize";
import type {
  AssistantComposerProps,
  ComposerAttachment,
  ComposerLabels,
  SlashCommand,
} from "./assistant-composer.types";

const defaultLabels: ComposerLabels = {
  placeholder: "Send a message",
  send: "Send message",
  stop: "Stop generating",
  attach: "Attach files",
  removeAttachment: "Remove {name}",
  commands: "Commands",
  noCommands: "No matching commands",
  charactersRemaining: "{n} characters remaining",
  dropHere: "Drop files to attach",
};

/* Stable identities: a fresh [] every render reads as a changed prop. */
const NO_ATTACHMENTS: readonly ComposerAttachment[] = [];
const NO_COMMANDS: readonly SlashCommand[] = [];

const ICON_BUTTON =
  "inline-flex size-8 shrink-0 items-center justify-center rounded text-fg-muted transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/** Announce the character budget once, on the way in. */
const WARN_AT = 0.9;

export const AssistantComposer = React.forwardRef<HTMLFormElement, AssistantComposerProps>(
  (props, ref) => {
    const {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onSubmit,
      status = "idle",
      onStop,
      placeholder,
      disabled = false,
      maxLength,
      minRows = 1,
      maxRows = 12,
      submitOn = "enter",
      clearOnSubmit = true,
      attachments,
      onAttachmentsAdd,
      onAttachmentRemove,
      accept,
      maxFiles,
      maxFileSize,
      allowPaste = true,
      allowDrop = true,
      backspaceRemovesLastAttachment = true,
      onFileRejected,
      commands,
      onCommandSelect,
      commandTrigger = "/",
      commandFilter,
      renderCommandItem,
      toolbar,
      footer,
      labels: labelsProp,
      className,
      textareaProps,
      inputRef,
    } = props;

    const labels: ComposerLabels = { ...defaultLabels, ...labelsProp };

    /* Features exist only when their data is supplied — no boolean flags. */
    const attachmentsEnabled = attachments !== undefined;
    const items = attachments ?? NO_ATTACHMENTS;
    const commandsEnabled = commands !== undefined;

    const [value, setValue] = useControllableState<string>({
      prop: valueProp,
      defaultProp: defaultValue,
      onChange: onValueChange,
    });

    const baseId = React.useId();
    const counterId = `${baseId}-counter`;

    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    useAutosize(textareaRef, value, minRows, maxRows);

    const setTextareaRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof inputRef === "function") inputRef(node);
        else if (inputRef) (inputRef as React.RefObject<HTMLTextAreaElement | null>).current = node;
      },
      [inputRef]
    );

    const menu = useSlashCommands({
      commands: commands ?? NO_COMMANDS,
      trigger: commandTrigger,
      filter: commandFilter,
      onSelect: onCommandSelect,
    });
    const menuOpen = commandsEnabled && menu.isOpen;

    /* ---- files ------------------------------------------------------- */

    const addFiles = React.useCallback(
      (incoming: readonly File[]) => {
        if (!attachmentsEnabled || incoming.length === 0) return;
        const { accepted, rejected } = validateFiles(incoming, {
          accept,
          maxFiles,
          maxFileSize,
          currentCount: items.length,
        });
        for (const rejection of rejected) onFileRejected?.(rejection.file, rejection.reason);
        if (accepted.length > 0) onAttachmentsAdd?.(accepted);
      },
      [attachmentsEnabled, accept, maxFiles, maxFileSize, items.length, onFileRejected, onAttachmentsAdd]
    );

    /* Nested elements fire dragleave on every crossing; count depth instead. */
    const dragDepth = React.useRef(0);
    const [dragActive, setDragActive] = React.useState(false);
    const dropEnabled = attachmentsEnabled && allowDrop && !disabled;

    /* ---- submit ------------------------------------------------------ */

    const canSubmit = !disabled && status === "idle" && (value.trim() !== "" || items.length > 0);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSubmit) return;
      await onSubmit({ text: value, attachments: items });
      /* Only after a resolved submit: clearing optimistically loses the draft
         when the send throws. */
      if (clearOnSubmit) setValue("");
    };

    const submit = () => {
      const form = textareaRef.current?.form;
      if (form === null || form === undefined) return;
      if (typeof form.requestSubmit === "function") form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    };

    /**
     * Keyboard, menu closed. The menu's own keys are claimed upstream by
     * `getInputProps`, so this handler simply never sees Enter while an option
     * is highlighted (SPEC section 5.7).
     */
    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      textareaProps?.onKeyDown?.(event);
      if (event.defaultPrevented) return;

      const modEnter = event.key === "Enter" && (event.metaKey || event.ctrlKey);
      const plainEnter =
        event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;

      if (modEnter || (submitOn === "enter" && plainEnter)) {
        event.preventDefault();
        submit();
        return;
      }

      /* Guarded by an empty value AND a collapsed caret at 0, so it can never
         eat typed text. Escape is deliberately absent: it must not clear a draft. */
      if (
        event.key === "Backspace" &&
        backspaceRemovesLastAttachment &&
        attachmentsEnabled &&
        value === "" &&
        event.currentTarget.selectionStart === 0 &&
        event.currentTarget.selectionEnd === 0
      ) {
        const last = items[items.length - 1];
        if (last !== undefined) {
          event.preventDefault();
          onAttachmentRemove?.(last.id);
        }
      }
    };

    const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
      textareaProps?.onPaste?.(event);
      if (event.defaultPrevented || !attachmentsEnabled || !allowPaste || disabled) return;
      const files = Array.from(event.clipboardData?.files ?? []);
      if (files.length === 0) return;
      /* Same validation path as the file input — a pasted screenshot is a file. */
      event.preventDefault();
      addFiles(files);
    };

    /* ---- character budget -------------------------------------------- */

    const remaining = maxLength === undefined ? undefined : maxLength - value.length;
    const nearLimit = maxLength !== undefined && value.length >= maxLength * WARN_AT;
    const [budgetNotice, setBudgetNotice] = React.useState("");
    const wasNearLimit = React.useRef(false);

    React.useEffect(() => {
      /* Once, on the crossing. A counter that re-announces per keystroke makes
         the last 10% of a long prompt unusable with a screen reader. */
      if (nearLimit && !wasNearLimit.current && remaining !== undefined) {
        setBudgetNotice(fill(labels.charactersRemaining, "{n}", remaining));
      } else if (!nearLimit && wasNearLimit.current) {
        setBudgetNotice("");
      }
      wasNearLimit.current = nearLimit;
    }, [nearLimit, remaining, labels.charactersRemaining]);

    const streaming = status === "streaming";
    const describedBy =
      [textareaProps?.["aria-describedby"], remaining === undefined ? undefined : counterId]
        .filter(Boolean)
        .join(" ") || undefined;

    const ownProps: React.TextareaHTMLAttributes<HTMLTextAreaElement> = {
      ...textareaProps,
      onKeyDown: handleKeyDown,
      onPaste: handlePaste,
    };
    /* Without `commands` there is no listbox, so the textarea keeps its native
       role rather than claiming a combobox that controls nothing. */
    const inputProps = commandsEnabled ? menu.getInputProps(ownProps) : ownProps;

    return (
      <form
        ref={ref}
        className={cn("flex flex-col gap-1.5", className)}
        onSubmit={handleSubmit}
      >
        <div
          data-drag-active={dragActive ? "" : undefined}
          className={cn(
            "relative flex flex-col gap-2 rounded-lg border border-border bg-surface p-2 focus-within:ring-2 focus-within:ring-ring",
            dragActive && "border-accent bg-accent/5 ring-2 ring-accent"
          )}
          onDragEnter={
            dropEnabled
              ? (event) => {
                  if (!Array.from(event.dataTransfer.types).includes("Files")) return;
                  dragDepth.current += 1;
                  setDragActive(true);
                }
              : undefined
          }
          onDragOver={dropEnabled ? (event) => event.preventDefault() : undefined}
          onDragLeave={
            dropEnabled
              ? () => {
                  dragDepth.current = Math.max(0, dragDepth.current - 1);
                  if (dragDepth.current === 0) setDragActive(false);
                }
              : undefined
          }
          onDrop={
            dropEnabled
              ? (event) => {
                  event.preventDefault();
                  dragDepth.current = 0;
                  setDragActive(false);
                  addFiles(Array.from(event.dataTransfer.files));
                }
              : undefined
          }
        >
          {attachmentsEnabled && items.length > 0 && (
            <ul className="flex list-none flex-wrap gap-1.5">
              {items.map((attachment) => (
                <AttachmentChip
                  key={attachment.id}
                  attachment={attachment}
                  labels={labels}
                  disabled={disabled}
                  onRemove={onAttachmentRemove}
                />
              ))}
            </ul>
          )}

          <textarea
            {...inputProps}
            ref={setTextareaRefs}
            rows={minRows}
            value={value}
            disabled={disabled}
            maxLength={maxLength}
            placeholder={placeholder ?? labels.placeholder}
            aria-label={
              textareaProps?.["aria-labelledby"] === undefined
                ? (textareaProps?.["aria-label"] ?? labels.placeholder)
                : undefined
            }
            aria-describedby={describedBy}
            onChange={(event) => {
              inputProps.onChange?.(event);
              setValue(event.currentTarget.value);
            }}
            className="w-full resize-none bg-transparent px-1 text-sm text-fg outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed"
          />

          {menuOpen && (
            <CommandMenu menu={menu} labels={labels} renderCommandItem={renderCommandItem} />
          )}

          <div className="flex items-center gap-2">
            {attachmentsEnabled && (
              <button
                type="button"
                disabled={disabled}
                aria-label={labels.attach}
                onClick={() => fileInputRef.current?.click()}
                className={ICON_BUTTON}
              >
                <span aria-hidden="true">+</span>
              </button>
            )}

            {toolbar}

            {remaining !== undefined && (
              <span
                id={counterId}
                aria-live="off"
                className="ml-auto text-xs tabular-nums text-fg-subtle"
              >
                <span aria-hidden="true">{remaining}</span>
                {/* The description a screen reader reads is the sentence, not
                    a bare number floating next to the send button. */}
                <span className="sr-only">
                  {fill(labels.charactersRemaining, "{n}", remaining)}
                </span>
              </span>
            )}

            {/* Send and stop are siblings in a stable wrapper, never one button
                that changes meaning: focus is not transplanted mid-stream. */}
            <div className={cn("flex items-center gap-1", remaining === undefined && "ml-auto")}>
              {streaming && onStop && (
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex h-8 items-center rounded border border-border px-3 text-sm text-fg-muted transition-colors hover:bg-surface-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {labels.stop}
                </button>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                aria-label={labels.send}
                className="inline-flex h-8 items-center rounded bg-accent px-3 text-sm font-medium text-accent-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <span aria-hidden="true">&uarr;</span>
              </button>
            </div>
          </div>

          {dragActive && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-surface/80 text-sm font-medium text-accent"
            >
              {labels.dropHere}
            </div>
          )}
        </div>

        {/* Always rendered, always reachable through the visible attach button:
            drag-and-drop is never the only path to an attachment. */}
        {attachmentsEnabled && (
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only"
            onChange={(event) => {
              addFiles(Array.from(event.currentTarget.files ?? []));
              /* Reset so re-picking the same file fires change again. */
              event.currentTarget.value = "";
            }}
          />
        )}

        {footer}

        <div role="status" aria-live="polite" className="sr-only">
          {budgetNotice}
        </div>
      </form>
    );
  }
);

AssistantComposer.displayName = "AssistantComposer";
