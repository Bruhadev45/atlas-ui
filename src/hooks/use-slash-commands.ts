import * as React from "react";
import type {
  SlashCommand,
  SlashCommandContext,
} from "../components/assistant-composer/assistant-composer.types";

export interface UseSlashCommandsOptions {
  commands: readonly SlashCommand[];
  /** @default "/" */
  trigger?: string;
  /** Only open when the trigger starts a line or follows whitespace. @default true */
  requireWordBoundary?: boolean;
  filter?: (commands: readonly SlashCommand[], query: string) => SlashCommand[];
  onSelect?: (command: SlashCommand, ctx: SlashCommandContext) => void;
  /** @default 8 */
  maxItems?: number;
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export interface UseSlashCommandsResult {
  isOpen: boolean;
  query: string;
  items: SlashCommand[];
  activeIndex: number;
  /** DOM id of the active option, for aria-activedescendant. */
  activeId: string | undefined;

  getInputProps: (props?: TextareaProps) => TextareaProps & {
    role: "combobox";
    "aria-expanded": boolean;
    "aria-controls": string | undefined;
    "aria-activedescendant": string | undefined;
    "aria-autocomplete": "list";
  };

  getListProps: () => { id: string; role: "listbox"; "aria-label": string };

  getItemProps: (
    command: SlashCommand,
    index: number
  ) => {
    id: string;
    role: "option";
    "aria-selected": boolean;
    "aria-disabled": boolean | undefined;
    onPointerEnter: () => void;
    onPointerDown: (e: React.PointerEvent) => void;
    onClick: () => void;
  };

  open: () => void;
  close: () => void;
  /** Selects `index`, or the active item when omitted. */
  select: (index?: number) => void;
}

export interface TriggerToken {
  query: string;
  triggerStart: number;
}

/**
 * Pure: locates the command token the caret currently sits inside, or `null`.
 *
 * A command is a single word, so any whitespace between the trigger and the
 * caret ends the token — typing "/cite the act" stops matching at the space
 * rather than treating the rest of the sentence as a query.
 */
export function findTrigger(
  value: string,
  caret: number,
  trigger: string,
  requireWordBoundary: boolean
): TriggerToken | null {
  if (trigger.length === 0) return null;
  const before = value.slice(0, caret);
  const triggerStart = before.lastIndexOf(trigger);
  if (triggerStart === -1) return null;

  if (requireWordBoundary && triggerStart > 0) {
    const preceding = value[triggerStart - 1];
    if (preceding !== undefined && !/\s/.test(preceding)) return null;
  }

  const query = value.slice(triggerStart + trigger.length, caret);
  if (/\s/.test(query)) return null;

  return { query, triggerStart };
}

/** Pure: name-first, then keywords. Ranked so a prefix hit sorts above a substring. */
export function defaultCommandFilter(
  commands: readonly SlashCommand[],
  query: string
): SlashCommand[] {
  if (query === "") return [...commands];
  const needle = query.toLowerCase();

  const scored: { command: SlashCommand; rank: number }[] = [];
  for (const command of commands) {
    const name = command.name.toLowerCase();
    let rank = -1;
    if (name.startsWith(needle)) rank = 0;
    else if (name.includes(needle)) rank = 1;
    else if (command.keywords?.some((k) => k.toLowerCase().includes(needle))) rank = 2;
    if (rank >= 0) scored.push({ command, rank });
  }

  /* Stable within a rank: the consumer's declaration order is meaningful. */
  return scored
    .map((entry, index) => ({ ...entry, index }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.command);
}

const NAVIGATION_KEYS = new Set(["ArrowDown", "ArrowUp", "Home", "End", "Enter", "Tab", "Escape"]);

/**
 * Menu state for a "/" command palette inside a text input (SPEC section 5.7).
 *
 * The hook deliberately owns no text. `onSelect` receives a context whose
 * `replace(text)` is a pure function returning a NEW string, which the consumer
 * applies to its own state — so the same hook drives a controlled composer, an
 * uncontrolled one, or someone else's editor.
 */
export function useSlashCommands(options: UseSlashCommandsOptions): UseSlashCommandsResult {
  const {
    commands,
    trigger = "/",
    requireWordBoundary = true,
    filter = defaultCommandFilter,
    onSelect,
    maxItems = 8,
  } = options;

  const baseId = React.useId();
  const listId = `${baseId}-commands`;

  const [token, setToken] = React.useState<TriggerToken | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  /* Escape dismisses this token only; typing on produces a new key and reopens. */
  const [dismissedKey, setDismissedKey] = React.useState<string | null>(null);

  /* The caret and value at the last observed event, for `select`'s context. */
  const caretRef = React.useRef({ value: "", caret: 0 });

  const filterRef = React.useRef(filter);
  filterRef.current = filter;
  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;

  const tokenKey = token === null ? null : `${token.triggerStart}:${token.query}`;
  const isOpen = token !== null && tokenKey !== dismissedKey;

  const items = React.useMemo(
    () => (token === null ? [] : filterRef.current(commands, token.query).slice(0, maxItems)),
    [commands, token, maxItems]
  );

  /* A shrinking list must never leave the active index pointing past the end. */
  const boundedIndex = items.length === 0 ? 0 : Math.min(activeIndex, items.length - 1);
  const activeId = isOpen && items.length > 0 ? `${listId}-option-${boundedIndex}` : undefined;

  /* Read by `select`, which is called from event handlers a render behind. */
  const itemsRef = React.useRef(items);
  itemsRef.current = items;
  const indexRef = React.useRef(boundedIndex);
  indexRef.current = boundedIndex;
  const tokenRef = React.useRef(token);
  tokenRef.current = token;
  const openRef = React.useRef(isOpen);
  openRef.current = isOpen;

  const close = React.useCallback(() => {
    setToken(null);
    setDismissedKey(null);
    setActiveIndex(0);
  }, []);

  const sync = React.useCallback(
    (element: HTMLTextAreaElement) => {
      const value = element.value;
      const caret = element.selectionStart ?? value.length;
      caretRef.current = { value, caret };

      const next = findTrigger(value, caret, trigger, requireWordBoundary);
      const previous = tokenRef.current;
      const unchanged =
        (previous === null && next === null) ||
        (previous !== null &&
          next !== null &&
          previous.query === next.query &&
          previous.triggerStart === next.triggerStart);
      if (unchanged) return;

      tokenRef.current = next;
      setToken(next);
      setActiveIndex(0);
    },
    [trigger, requireWordBoundary]
  );

  const open = React.useCallback(() => setDismissedKey(null), []);

  const select = React.useCallback(
    (index?: number) => {
      const command = itemsRef.current[index ?? indexRef.current];
      if (command === undefined || command.disabled) return;

      const current = tokenRef.current;
      if (current === null) return;
      const { value, caret } = caretRef.current;
      const { triggerStart } = current;

      const ctx: SlashCommandContext = {
        value,
        query: current.query,
        triggerStart,
        caret,
        replace: (text: string) => value.slice(0, triggerStart) + text + value.slice(caret),
      };

      onSelectRef.current?.(command, ctx);
      close();
    },
    [close]
  );

  const move = React.useCallback((delta: number) => {
    const count = itemsRef.current.length;
    if (count === 0) return;
    setActiveIndex((previous) => {
      const from = Math.min(previous, count - 1);
      return (from + delta + count) % count;
    });
  }, []);

  const getInputProps: UseSlashCommandsResult["getInputProps"] = (props = {}) => ({
    ...props,
    role: "combobox",
    "aria-expanded": isOpen,
    "aria-controls": isOpen ? listId : undefined,
    "aria-activedescendant": activeId,
    "aria-autocomplete": "list",
    onChange: (event) => {
      props.onChange?.(event);
      sync(event.currentTarget);
    },
    onClick: (event) => {
      props.onClick?.(event);
      sync(event.currentTarget);
    },
    onKeyUp: (event) => {
      props.onKeyUp?.(event);
      /* Arrow/Home/End move the caret out of the token without firing change. */
      if (!NAVIGATION_KEYS.has(event.key)) sync(event.currentTarget);
    },
    onBlur: (event) => {
      props.onBlur?.(event);
      close();
    },
    /*
     * The menu claims its keys BEFORE the consumer's handler runs, and swallows
     * them when it acts. That ordering is what stops a composer's Enter-submits
     * from firing while an option is highlighted, without the composer having
     * to know the menu exists.
     */
    onKeyDown: (event) => {
      if (openRef.current && !event.altKey && !event.ctrlKey && !event.metaKey) {
        const count = itemsRef.current.length;
        switch (event.key) {
          case "ArrowDown":
            move(1);
            event.preventDefault();
            return;
          case "ArrowUp":
            move(-1);
            event.preventDefault();
            return;
          case "Home":
            if (count > 0) {
              setActiveIndex(0);
              event.preventDefault();
              return;
            }
            break;
          case "End":
            if (count > 0) {
              setActiveIndex(count - 1);
              event.preventDefault();
              return;
            }
            break;
          case "Enter":
          case "Tab":
            /* With no matches there is nothing to select; fall through so the
               user is never trapped unable to send a message. */
            if (count > 0) {
              select();
              event.preventDefault();
              return;
            }
            break;
          case "Escape":
            setDismissedKey(tokenKey);
            event.preventDefault();
            return;
          default:
            break;
        }
      }
      props.onKeyDown?.(event);
    },
  });

  const getListProps: UseSlashCommandsResult["getListProps"] = () => ({
    id: listId,
    role: "listbox",
    "aria-label": "Commands",
  });

  const getItemProps: UseSlashCommandsResult["getItemProps"] = (command, index) => ({
    id: `${listId}-option-${index}`,
    role: "option",
    "aria-selected": index === boundedIndex,
    "aria-disabled": command.disabled ? true : undefined,
    onPointerEnter: () => setActiveIndex(index),
    /* Keep focus in the textarea: a blur would close the menu before the click. */
    onPointerDown: (event: React.PointerEvent) => event.preventDefault(),
    onClick: () => select(index),
  });

  return {
    isOpen,
    query: token?.query ?? "",
    items,
    activeIndex: boundedIndex,
    activeId,
    getInputProps,
    getListProps,
    getItemProps,
    open,
    close,
    select,
  };
}
