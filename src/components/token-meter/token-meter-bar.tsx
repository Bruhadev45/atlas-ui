import type * as React from "react";
import { cn } from "../../lib/cn";
import { clamp } from "../../lib/clamp";
import type { CSSVars } from "../../types";

export type MeterState = "ok" | "warn" | "danger";

/* Static lookup map (SPEC section 4.3); never template literals. */
const fillStateClass: Record<MeterState, string> = {
  ok: "bg-accent",
  warn: "bg-warning",
  danger: "bg-danger",
};

export interface TokenMeterBarProps {
  total: number;
  budget: number;
  state: MeterState;
  /** Accessible name for the meter. */
  label: string;
  valuetext: string;
}

/**
 * `role="meter"` is semantically correct — a measurement within a known range,
 * not task progress. Because meter support is uneven in VoiceOver, the parent
 * renders an sr-only sentence with the same information (SPEC section 5.5).
 */
export function TokenMeterBar(props: TokenMeterBarProps): React.JSX.Element {
  const { total, budget, state, label, valuetext } = props;
  const fillPct = clamp(budget > 0 ? (total / budget) * 100 : 0, 0, 100);
  /* The fill width is a CSS custom property, not a generated class (SPEC 4.4). */
  const fillStyle: CSSVars = { "--atlas-meter-fill": `${fillPct}%` };

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={budget}
      aria-valuenow={total}
      aria-valuetext={valuetext}
      className="h-2 min-w-16 flex-1 overflow-hidden rounded-full bg-surface-sunken"
    >
      <div
        data-state={state}
        className={cn("atlas-meter-fill h-full rounded-full", fillStateClass[state])}
        style={fillStyle}
      />
    </div>
  );
}
