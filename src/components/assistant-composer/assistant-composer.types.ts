import type * as React from "react";

export type ComposerStatus = "idle" | "submitting" | "streaming";

export interface ComposerAttachment {
  id: string;
  name: string;
  /** Bytes. */
  size?: number;
  mimeType?: string;
  /** @default "ready" */
  status?: "pending" | "uploading" | "ready" | "error";
  /** 0..1, shown when status is "uploading". */
  progress?: number;
  error?: string;
  /** Thumbnail URL. The consumer owns creation and revocation. */
  previewUrl?: string;
}

export interface SlashCommand {
  id: string;
  /** Typed after the trigger, without it. e.g. "cite" for "/cite". */
  name: string;
  description?: string;
  /** Optional group heading in the menu. */
  group?: string;
  icon?: React.ReactNode;
  /** Extra terms matched by the default filter. */
  keywords?: readonly string[];
  disabled?: boolean;
}

export interface SlashCommandContext {
  /** Current full textarea value. */
  value: string;
  /** Text typed after the trigger. */
  query: string;
  /** Index of the trigger character in `value`. */
  triggerStart: number;
  /** Caret index. */
  caret: number;
  /** Pure: returns a NEW value with the trigger token replaced by `text`. */
  replace: (text: string) => string;
}

export interface ComposerSubmitPayload {
  text: string;
  attachments: readonly ComposerAttachment[];
}

export interface ComposerLabels {
  placeholder: string;
  send: string;
  stop: string;
  attach: string;
  /** `{name}` is replaced with the attachment name. */
  removeAttachment: string;
  commands: string;
  noCommands: string;
  /** `{n}` is replaced with the remaining character count. */
  charactersRemaining: string;
  dropHere: string;
}

export type FileRejectionReason = "size" | "type" | "count";

export interface AssistantComposerProps {
  /** Controlled text. */
  value?: string;
  /** Uncontrolled initial text. @default "" */
  defaultValue?: string;
  onValueChange?: (value: string) => void;

  onSubmit: (payload: ComposerSubmitPayload) => void | Promise<void>;
  /** @default "idle" */
  status?: ComposerStatus;
  /** Renders a stop button in place of send while streaming. */
  onStop?: () => void;

  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  /** @default 1 */
  minRows?: number;
  /** @default 12 */
  maxRows?: number;
  /** "enter" -> Enter sends, Shift+Enter newline. @default "enter" */
  submitOn?: "enter" | "mod-enter";
  /** Clear the text after a resolved submit. @default true */
  clearOnSubmit?: boolean;

  /** Controlled-only. Omit entirely to disable attachments. */
  attachments?: readonly ComposerAttachment[];
  onAttachmentsAdd?: (files: readonly File[]) => void;
  onAttachmentRemove?: (id: string) => void;
  /** `<input accept>` value, e.g. "application/pdf,image/*". */
  accept?: string;
  maxFiles?: number;
  /** Bytes. Oversize files are rejected before `onAttachmentsAdd`. */
  maxFileSize?: number;
  /** @default true */
  allowPaste?: boolean;
  /** @default true */
  allowDrop?: boolean;
  /** Backspace on an empty input removes the last attachment. @default true */
  backspaceRemovesLastAttachment?: boolean;
  onFileRejected?: (file: File, reason: FileRejectionReason) => void;

  /** Omit to disable the slash menu. */
  commands?: readonly SlashCommand[];
  onCommandSelect?: (command: SlashCommand, ctx: SlashCommandContext) => void;
  /** @default "/" */
  commandTrigger?: string;
  commandFilter?: (commands: readonly SlashCommand[], query: string) => SlashCommand[];
  renderCommandItem?: (
    command: SlashCommand,
    state: { active: boolean; index: number }
  ) => React.ReactNode;

  /** Left of the send button. */
  toolbar?: React.ReactNode;
  /** Below the input, e.g. a TokenMeter. */
  footer?: React.ReactNode;

  labels?: Partial<ComposerLabels>;
  className?: string;
  textareaProps?: Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "defaultValue" | "onChange" | "disabled" | "maxLength" | "placeholder"
  >;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}
