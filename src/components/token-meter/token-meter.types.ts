import type * as React from "react";

export interface TokenUsage {
  prompt: number;
  completion: number;
  /** Defaults to prompt + completion (+ reasoning when present). */
  total?: number;
  /** Cached prompt tokens, billed at the discounted rate. */
  cached?: number;
  /** Thinking / reasoning tokens, billed at the completion rate unless priced. */
  reasoning?: number;
}

export interface TokenPricing {
  /** ISO 4217. @default "USD" */
  currency?: string;
  promptPerMTok: number;
  completionPerMTok: number;
  /** @default promptPerMTok */
  cachedPromptPerMTok?: number;
  /** @default completionPerMTok */
  reasoningPerMTok?: number;
}

export interface TokenMeterThresholds {
  /** Fraction of budget at which the meter turns warning. @default 0.75 */
  warn: number;
  /** Fraction at which it turns danger. @default 0.9 */
  danger: number;
}

export interface TokenMeterLabels {
  prompt: string; completion: string; cached: string;
  reasoning: string; total: string; budget: string;
  ofBudget: string;        // "of budget used"
  overBudget: string;      // "over budget"
  estimatedCost: string;   // "Estimated cost"
  showDetails: string; hideDetails: string;
}

export interface TokenMeterProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  usage: TokenUsage;
  /** Context window or per-request cap. Omit to render counts with no meter. */
  budget?: number;
  budgetLabel?: string;

  /** Used to compute cost when `cost` is not given. */
  pricing?: TokenPricing;
  /** Precomputed cost; wins over `pricing`. */
  cost?: number;

  /** @default "compact" */
  variant?: "compact" | "expanded";
  defaultVariant?: "compact" | "expanded";
  onVariantChange?: (v: "compact" | "expanded") => void;
  /** Render the built-in expand/collapse control. @default false */
  collapsible?: boolean;

  thresholds?: Partial<TokenMeterThresholds>;
  /** Number/currency formatting locale. @default undefined (runtime default) */
  locale?: string;
  formatCost?: (cost: number, currency: string) => string;

  /** Fired once per crossing into over-budget. */
  onOverBudget?: (info: { total: number; budget: number }) => void;

  labels?: Partial<TokenMeterLabels>;
}

export declare const TokenMeter: React.ForwardRefExoticComponent<
  TokenMeterProps & React.RefAttributes<HTMLDivElement>
>;
