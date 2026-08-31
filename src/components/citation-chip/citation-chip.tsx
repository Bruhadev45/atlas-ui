import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../lib/cn";
import { useControllableState } from "../../hooks/use-controllable-state";
import { CitationPreview } from "./citation-preview";
import type { CitationChipLabels, CitationChipProps } from "./citation-chip.types";

const defaultLabels: CitationChipLabels = {
  citation: "Citation",
  relevance: "relevance",
  openSource: "Open source",
  from: "from",
};

/* Static lookup maps only (SPEC section 4.3). */

const toneClass: Record<NonNullable<CitationChipProps["tone"]>, string> = {
  accent: "border-accent/25 bg-accent/12 text-accent hover:bg-accent/20",
  neutral: "border-border bg-surface-sunken text-fg-muted hover:bg-surface-raised",
};

const variantClass: Record<NonNullable<CitationChipProps["variant"]>, string> = {
  numeric: "min-w-[1.4em] px-1 py-px tabular-nums",
  dot: "h-[0.62em] w-[0.62em] p-0",
  text: "px-1.5 py-px",
};

const dotToneClass: Record<NonNullable<CitationChipProps["tone"]>, string> = {
  accent: "bg-accent",
  neutral: "bg-fg-subtle",
};

/* align-super + a sub-em size so chips do not disturb prose line-height. */
const chipBaseClass =
  "inline-flex select-none items-center justify-center rounded-sm border align-super text-[0.72em] font-medium leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface";

const previewBaseClass =
  "z-50 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-surface-raised p-3 text-fg shadow-lg focus-visible:outline-none";

/** Why the preview is open. Only "activate" takes focus into the card. */
type OpenReason = "hover" | "focus" | "activate";

export const CitationChip = React.forwardRef<HTMLButtonElement, CitationChipProps>(
  (props, ref) => {
    const {
      source,
      index,
      label,
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      openOnHover = true,
      openDelayMs = 120,
      closeDelayMs = 160,
      variant = "numeric",
      tone = "accent",
      onActivate,
      renderPreview,
      side = "top",
      align = "center",
      portalContainer,
      asChild = false,
      children,
      labels: labelsProp,
      className,
      previewClassName,
      ...rest
    } = props;

    const labels: CitationChipLabels = { ...defaultLabels, ...labelsProp };
    const headingId = React.useId();

    const [open, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });

    /* Hover and focus funnel into this one setter, so a controlled consumer
       sees one coherent stream of onOpenChange events (SPEC section 5.2). */
    type Timer = ReturnType<typeof setTimeout> | undefined;
    const reasonRef = React.useRef<OpenReason | null>(null);
    const tookFocusRef = React.useRef(false);
    const skipFocusOpenRef = React.useRef(false);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const openTimer = React.useRef<Timer>(undefined);
    const closeTimer = React.useRef<Timer>(undefined);
    const skipTimer = React.useRef<Timer>(undefined);

    const clearTimers = React.useCallback(() => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
      clearTimeout(skipTimer.current);
    }, []);
    React.useEffect(() => clearTimers, [clearTimers]);

    const openWith = React.useCallback(
      (reason: OpenReason) => {
        clearTimers();
        reasonRef.current = reason;
        setOpen(true);
      },
      [clearTimers, setOpen]
    );

    const close = React.useCallback(() => {
      clearTimers();
      reasonRef.current = null;
      setOpen(false);
    }, [clearTimers, setOpen]);

    /* Escape and outside-dismiss arrive here from Radix. */
    const handleOpenChange = React.useCallback(
      (next: boolean) => {
        if (next) openWith("activate");
        else close();
      },
      [close, openWith]
    );

    const handlePointerEnter = React.useCallback(() => {
      if (!openOnHover) return;
      clearTimeout(closeTimer.current);
      if (reasonRef.current !== null) return;
      openTimer.current = setTimeout(() => openWith("hover"), openDelayMs);
    }, [openDelayMs, openOnHover, openWith]);

    /* Focus-opened previews never close on pointerleave — only on blur or
       Escape. Mixing the two close paths is the classic bug where a keyboard
       user's card vanishes because the mouse happened to move. */
    const handlePointerLeave = React.useCallback(() => {
      if (!openOnHover) return;
      clearTimeout(openTimer.current);
      if (reasonRef.current !== "hover") return;
      closeTimer.current = setTimeout(close, closeDelayMs);
    }, [close, closeDelayMs, openOnHover]);

    const handleFocus = React.useCallback(() => {
      if (skipFocusOpenRef.current) return;
      if (reasonRef.current === "activate") return;
      openWith("focus");
    }, [openWith]);

    const handleBlur = React.useCallback(() => {
      if (reasonRef.current === "focus") close();
    }, [close]);

    /* preventDefault suppresses Radix's own trigger toggle, so activation is
       purely additive: it pins a preview that hover or focus already opened
       (and pulls focus into the card) instead of closing it. */
    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        onActivate?.(source);
        if (reasonRef.current === "activate") {
          close();
          return;
        }
        const wasOpen = reasonRef.current !== null;
        openWith("activate");
        if (wasOpen) {
          tookFocusRef.current = true;
          contentRef.current?.focus();
        }
      },
      [close, onActivate, openWith, source]
    );

    const accessibleName = [
      index == null ? labels.citation : `${labels.citation} ${index}`,
      [source.title, source.locator].filter(Boolean).join(" "),
    ].join(": ");

    const dot = (
      <span
        aria-hidden="true"
        className={cn("block h-full w-full rounded-full", dotToneClass[tone])}
      />
    );
    let chipContent: React.ReactNode;
    if (label !== undefined) chipContent = label;
    else if (variant === "dot") chipContent = dot;
    else if (variant === "text") chipContent = source.locator ?? source.title;
    else chipContent = index ?? dot;

    const Trigger = asChild ? Slot : "button";
    const triggerProps = asChild ? {} : { type: "button" as const };

    const content = (
      <PopoverPrimitive.Content
        ref={contentRef}
        side={side}
        align={align}
        sideOffset={6}
        collisionPadding={8}
        aria-labelledby={headingId}
        onOpenAutoFocus={(event: Event) => {
          if (reasonRef.current !== "activate") event.preventDefault();
          else tookFocusRef.current = true;
        }}
        onCloseAutoFocus={(event: Event) => {
          if (!tookFocusRef.current) {
            event.preventDefault();
          } else {
            /* Radix is about to focus the trigger; that focus event must not
               reopen what Escape just closed. Live for this task only. */
            skipFocusOpenRef.current = true;
            clearTimeout(skipTimer.current);
            skipTimer.current = setTimeout(() => {
              skipFocusOpenRef.current = false;
            }, 0);
          }
          tookFocusRef.current = false;
        }}
        onPointerEnter={() => clearTimeout(closeTimer.current)}
        onPointerLeave={handlePointerLeave}
        className={cn(previewBaseClass, previewClassName)}
      >
        {renderPreview ? (
          renderPreview(source)
        ) : (
          <CitationPreview source={source} labels={labels} headingId={headingId} />
        )}
      </PopoverPrimitive.Content>
    );

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
        <PopoverPrimitive.Trigger asChild>
          <Trigger
            ref={ref}
            {...rest}
            {...triggerProps}
            aria-label={accessibleName}
            data-variant={variant}
            data-tone={tone}
            className={cn(chipBaseClass, toneClass[tone], variantClass[variant], className)}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onClick={handleClick}
          >
            {asChild ? children : chipContent}
          </Trigger>
        </PopoverPrimitive.Trigger>
        {portalContainer === null ? (
          content
        ) : (
          <PopoverPrimitive.Portal container={portalContainer}>{content}</PopoverPrimitive.Portal>
        )}
      </PopoverPrimitive.Root>
    );
  }
);

CitationChip.displayName = "CitationChip";
