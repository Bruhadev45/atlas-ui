import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/cn";
import { InfoIcon, levelIcons } from "./confidence-icons";
import type {
  ConfidenceBadgeLabels,
  ConfidenceBadgeProps,
  ConfidenceLevel,
} from "./confidence-badge.types";

const defaultLabels: ConfidenceBadgeLabels = {
  prefix: "Confidence: ",
  levels: {
    high: "High",
    medium: "Medium",
    low: "Low",
    insufficient: "Insufficient evidence",
  },
  calibration: "How this is calculated",
};

/* Static lookup maps only (SPEC section 4.3): every class survives as a
   complete string literal in dist so Tailwind Mode B can extract it. */

const softClass: Record<ConfidenceLevel, string> = {
  high: "border border-conf-high/25 bg-conf-high/12 text-conf-high",
  medium: "border border-conf-medium/25 bg-conf-medium/12 text-conf-medium",
  low: "border border-conf-low/25 bg-conf-low/12 text-conf-low",
  insufficient:
    "border border-conf-insufficient/25 bg-conf-insufficient/12 text-conf-insufficient",
};

const solidClass: Record<ConfidenceLevel, string> = {
  high: "border border-transparent bg-conf-high text-surface",
  medium: "border border-transparent bg-conf-medium text-surface",
  low: "border border-transparent bg-conf-low text-surface",
  insufficient: "border border-transparent bg-conf-insufficient text-surface",
};

const outlineClass: Record<ConfidenceLevel, string> = {
  high: "border border-conf-high text-conf-high",
  medium: "border border-conf-medium text-conf-medium",
  low: "border border-conf-low text-conf-low",
  insufficient: "border border-conf-insufficient text-conf-insufficient",
};

const variantClass: Record<
  NonNullable<ConfidenceBadgeProps["variant"]>,
  Record<ConfidenceLevel, string>
> = {
  soft: softClass,
  solid: solidClass,
  outline: outlineClass,
};

const sizeClass: Record<NonNullable<ConfidenceBadgeProps["size"]>, string> = {
  sm: "gap-1 px-1.5 py-0.5 text-xs",
  md: "gap-1.5 px-2 py-0.5 text-sm",
};

const iconSizeClass: Record<NonNullable<ConfidenceBadgeProps["size"]>, string> = {
  sm: "h-3 w-3 shrink-0",
  md: "h-3.5 w-3.5 shrink-0",
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

/* WCAG 2.2 SC 2.5.8: the info button keeps a 24x24 CSS px hit target even at
   size="sm"; negative margin stops the padded target inflating the badge. */
const infoButtonClass = cn(
  "-my-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
  "hover:bg-surface-raised hover:text-fg",
  focusRing
);

const calibrationContentClass =
  "z-50 max-w-72 rounded border border-border bg-surface-raised px-3 py-2 text-xs leading-relaxed text-fg shadow-md";

function formatScore(score: number): string {
  return score.toFixed(2);
}

export const ConfidenceBadge = React.forwardRef<HTMLSpanElement, ConfidenceBadgeProps>(
  (props, ref) => {
    const {
      level,
      score,
      showScore = false,
      size = "md",
      variant = "soft",
      icon = true,
      description,
      calibration,
      calibrationAs = "tooltip",
      open,
      defaultOpen,
      onOpenChange,
      labels: labelsProp,
      className,
      ...rest
    } = props;

    const labels: ConfidenceBadgeLabels = {
      ...defaultLabels,
      ...labelsProp,
      levels: { ...defaultLabels.levels, ...labelsProp?.levels },
    };

    const LevelIcon = levelIcons[level];
    const iconNode =
      icon === false ? null : icon === true ? (
        <LevelIcon aria-hidden="true" className={iconSizeClass[size]} />
      ) : (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      );

    const infoButton = (
      <button type="button" aria-label={labels.calibration} className={infoButtonClass}>
        <InfoIcon aria-hidden="true" className={iconSizeClass[size]} />
      </button>
    );

    let calibrationNode: React.ReactNode = null;
    if (calibration != null) {
      calibrationNode =
        calibrationAs === "popover" ? (
          <PopoverPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
            <PopoverPrimitive.Trigger asChild>{infoButton}</PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
              {/* Radix renders role="dialog"; a dialog must carry an accessible name. */}
              <PopoverPrimitive.Content
                aria-label={labels.calibration}
                sideOffset={6}
                className={calibrationContentClass}
              >
                {calibration}
              </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
          </PopoverPrimitive.Root>
        ) : (
          <TooltipPrimitive.Provider delayDuration={200}>
            <TooltipPrimitive.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
              <TooltipPrimitive.Trigger asChild>{infoButton}</TooltipPrimitive.Trigger>
              <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content sideOffset={6} className={calibrationContentClass}>
                  {calibration}
                </TooltipPrimitive.Content>
              </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
          </TooltipPrimitive.Provider>
        );
    }

    /* Accessible name from a visually-hidden prefix plus visible text — never
       aria-label on a non-interactive span (SPEC section 5.3). Reads as
       "Confidence: High (0.91), based on 5 sources". */
    return (
      <span
        ref={ref}
        data-level={level}
        className={cn(
          "inline-flex items-center rounded font-medium",
          sizeClass[size],
          variantClass[variant][level],
          className
        )}
        {...rest}
      >
        <span className="sr-only">{labels.prefix}</span>
        {iconNode}
        {labels.levels[level]}
        {showScore && score != null && (
          <span className="tabular-nums">{formatScore(score)}</span>
        )}
        {!showScore && score != null && (
          <span className="sr-only"> ({formatScore(score)})</span>
        )}
        {description && <span className="sr-only">, {description}</span>}
        {calibrationNode}
      </span>
    );
  }
);

ConfidenceBadge.displayName = "ConfidenceBadge";
