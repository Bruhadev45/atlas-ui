import * as React from "react";
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { cn } from "../../lib/cn";
import { formatCost as formatCostDefault, formatTokens } from "../../lib/format";
import { useControllableState } from "../../hooks/use-controllable-state";
import { estimateCost } from "./pricing";
import { TokenMeterBar, type MeterState } from "./token-meter-bar";
import type {
  TokenMeterLabels,
  TokenMeterProps,
  TokenMeterThresholds,
} from "./token-meter.types";

const defaultLabels: TokenMeterLabels = {
  prompt: "Prompt",
  completion: "Completion",
  cached: "Cached",
  reasoning: "Reasoning",
  total: "Total",
  budget: "Budget",
  ofBudget: "of budget used",
  overBudget: "over budget",
  estimatedCost: "Estimated cost",
  showDetails: "Show details",
  hideDetails: "Hide details",
};

const defaultThresholds: TokenMeterThresholds = { warn: 0.75, danger: 0.9 };

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

const triggerClass = cn(
  "shrink-0 rounded border border-border px-2 py-0.5 text-xs text-fg-muted hover:bg-surface-raised",
  focusRing
);

/** Over-budget is never colour-only: shape + text accompany the red. */
function WarningIcon(props: React.SVGAttributes<SVGSVGElement>): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" {...props}>
      <path d="M8 2.5 14.5 13.5H1.5L8 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 7v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.9" r="0.8" fill="currentColor" />
    </svg>
  );
}

/** 0 = under warn, 1 = warn, 2 = danger, 3 = over budget. */
type ThresholdBand = 0 | 1 | 2 | 3;

interface DetailsProps {
  usage: TokenMeterProps["usage"];
  total: number;
  budget: number | undefined;
  budgetLabel: string | undefined;
  costText: string | undefined;
  labels: TokenMeterLabels;
  format: (n: number) => string;
}

function TokenMeterDetails(props: DetailsProps): React.JSX.Element {
  const { usage, total, budget, budgetLabel, costText, labels, format } = props;
  const row = (term: string, value: string) => (
    <div className="contents">
      <dt className="text-fg-muted">{term}</dt>
      <dd className="justify-self-end tabular-nums text-fg">{value}</dd>
    </div>
  );

  return (
    <dl className="grid grid-cols-[auto_auto] justify-between gap-x-4 gap-y-1">
      {row(labels.prompt, format(usage.prompt))}
      {row(labels.completion, format(usage.completion))}
      {usage.cached != null && row(labels.cached, format(usage.cached))}
      {usage.reasoning != null && row(labels.reasoning, format(usage.reasoning))}
      {row(labels.total, format(total))}
      {budget != null && row(budgetLabel ?? labels.budget, format(budget))}
      {costText != null && row(labels.estimatedCost, costText)}
    </dl>
  );
}

export const TokenMeter = React.forwardRef<HTMLDivElement, TokenMeterProps>((props, ref) => {
  const {
    usage,
    budget,
    budgetLabel,
    pricing,
    cost,
    variant,
    defaultVariant,
    onVariantChange,
    collapsible = false,
    thresholds,
    locale,
    formatCost: formatCostProp,
    onOverBudget,
    labels: labelsProp,
    className,
    ...rest
  } = props;

  const labels: TokenMeterLabels = { ...defaultLabels, ...labelsProp };
  const t: TokenMeterThresholds = { ...defaultThresholds, ...thresholds };

  const reasoning = usage.reasoning ?? 0;
  const total = usage.total ?? usage.prompt + usage.completion + reasoning;
  const hasBudget = budget != null;
  const ratio = hasBudget && budget > 0 ? total / budget : 0;
  const overBudget = hasBudget && total > budget;

  const band: ThresholdBand = !hasBudget
    ? 0
    : overBudget
      ? 3
      : ratio >= t.danger
        ? 2
        : ratio >= t.warn
          ? 1
          : 0;
  const meterState: MeterState = band >= 2 ? "danger" : band === 1 ? "warn" : "ok";

  const [variantValue, setVariant] = useControllableState<"compact" | "expanded">({
    prop: variant,
    defaultProp: defaultVariant ?? "compact",
    onChange: onVariantChange,
  });
  const isExpanded = variantValue === "expanded";

  const numberFormat = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatFull = (n: number) => numberFormat.format(n);

  const currency = pricing?.currency ?? "USD";
  const computedCost = cost ?? (pricing ? estimateCost(usage, pricing) : undefined);
  const costText =
    computedCost != null
      ? formatCostProp
        ? formatCostProp(computedCost, currency)
        : formatCostDefault(computedCost, currency, locale)
      : undefined;

  const valuetext = hasBudget
    ? `${formatFull(total)} of ${formatFull(budget)} tokens, ${Math.round(ratio * 100)}% ${
        labels.ofBudget
      }${overBudget ? `, ${labels.overBudget}` : ""}`
    : undefined;

  /* onOverBudget fires once per crossing into over-budget, tracked by ref. */
  const onOverBudgetRef = React.useRef(onOverBudget);
  onOverBudgetRef.current = onOverBudget;
  const wasOverRef = React.useRef(false);
  React.useEffect(() => {
    if (budget == null) {
      wasOverRef.current = false;
      return;
    }
    const over = total > budget;
    if (over && !wasOverRef.current) {
      onOverBudgetRef.current?.({ total, budget });
    }
    wasOverRef.current = over;
  }, [total, budget]);

  /* The counter is not a live region (it updates per token). A separate polite
     region announces threshold crossings once each, deduplicated by ref. */
  const [announcement, setAnnouncement] = React.useState("");
  const announceBandRef = React.useRef<ThresholdBand>(0);
  const labelsRef = React.useRef(labels);
  labelsRef.current = labels;
  const thresholdsRef = React.useRef(t);
  thresholdsRef.current = t;
  React.useEffect(() => {
    const previous = announceBandRef.current;
    announceBandRef.current = band;
    if (band <= previous) return;
    const currentLabels = labelsRef.current;
    const currentThresholds = thresholdsRef.current;
    setAnnouncement(
      band === 3
        ? currentLabels.overBudget
        : band === 2
          ? `${Math.round(currentThresholds.danger * 100)}% ${currentLabels.ofBudget}`
          : `${Math.round(currentThresholds.warn * 100)}% ${currentLabels.ofBudget}`
    );
  }, [band]);

  const headerRow = (
    <div className="flex items-center gap-2">
      {hasBudget && (
        <TokenMeterBar
          total={total}
          budget={budget}
          state={meterState}
          label={budgetLabel ?? labels.budget}
          valuetext={valuetext as string}
        />
      )}
      {/* tabular-nums: a streaming counter must not shift layout per token. */}
      <span aria-live="off" className="shrink-0 whitespace-nowrap tabular-nums text-fg">
        {formatTokens(total, locale)}
        {hasBudget && <> / {formatTokens(budget, locale)}</>}
      </span>
      {overBudget && (
        <span className="flex shrink-0 items-center gap-1 font-medium text-danger">
          <WarningIcon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {labels.overBudget}
        </span>
      )}
      {costText != null && (
        <span className="shrink-0 whitespace-nowrap tabular-nums text-fg-muted">
          <span className="sr-only">{labels.estimatedCost} </span>
          {costText}
        </span>
      )}
      {collapsible && (
        <CollapsiblePrimitive.Trigger className={triggerClass}>
          {isExpanded ? labels.hideDetails : labels.showDetails}
        </CollapsiblePrimitive.Trigger>
      )}
    </div>
  );

  const details = (
    <TokenMeterDetails
      usage={usage}
      total={total}
      budget={budget}
      budgetLabel={budgetLabel}
      costText={costText}
      labels={labels}
      format={formatFull}
    />
  );

  return (
    <div
      ref={ref}
      data-variant={variantValue}
      data-state={hasBudget ? meterState : undefined}
      data-over-budget={overBudget ? "true" : undefined}
      className={cn("flex w-full flex-col gap-1.5 text-sm text-fg", className)}
      {...rest}
    >
      {collapsible ? (
        <CollapsiblePrimitive.Root
          open={isExpanded}
          onOpenChange={(next) => setVariant(next ? "expanded" : "compact")}
        >
          {headerRow}
          <CollapsiblePrimitive.Content className="atlas-collapse overflow-hidden">
            <div className="pt-1.5">{details}</div>
          </CollapsiblePrimitive.Content>
        </CollapsiblePrimitive.Root>
      ) : (
        <>
          {headerRow}
          {isExpanded && details}
        </>
      )}
      {/* meter support is uneven in VoiceOver; same information as a sentence. */}
      {valuetext != null && <p className="sr-only">{valuetext}</p>}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
});

TokenMeter.displayName = "TokenMeter";
