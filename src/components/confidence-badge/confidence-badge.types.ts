import type * as React from "react";

export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient";

export interface ConfidenceBadgeLabels {
  prefix: string;                                  // "Confidence: "
  levels: Record<ConfidenceLevel, string>;         // High / Medium / Low / Insufficient evidence
  calibration: string;                             // "How this is calculated"
}

export interface ConfidenceBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  level: ConfidenceLevel;
  /** 0..1. Included in the accessible name; shown when `showScore`. */
  score?: number;
  /** @default false */
  showScore?: boolean;
  /** @default "md" */
  size?: "sm" | "md";
  /** @default "soft" */
  variant?: "solid" | "soft" | "outline";
  /** Redundant non-colour cue. `false` removes it. @default true */
  icon?: React.ReactNode | boolean;
  /** Appended to the accessible name, e.g. "based on 5 sources". */
  description?: string;

  /** Calibration explainer. Omit to render no info affordance. */
  calibration?: React.ReactNode;
  /** Tooltip content must be non-interactive; use "popover" for links. @default "tooltip" */
  calibrationAs?: "tooltip" | "popover";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  labels?: Partial<ConfidenceBadgeLabels>;
}

export declare const ConfidenceBadge: React.ForwardRefExoticComponent<
  ConfidenceBadgeProps & React.RefAttributes<HTMLSpanElement>
>;
