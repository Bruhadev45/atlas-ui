import type { TokenPricing, TokenUsage } from "./token-meter.types";

const TOKENS_PER_MTOK = 1_000_000;

/**
 * Estimates cost from usage and per-MTok pricing. Cached prompt tokens are
 * billed at `cachedPromptPerMTok` and subtracted from `prompt` so they are
 * never double-counted; reasoning tokens bill at
 * `reasoningPerMTok ?? completionPerMTok`.
 */
export function estimateCost(usage: TokenUsage, pricing: TokenPricing): number {
  const cached = usage.cached ?? 0;
  const reasoning = usage.reasoning ?? 0;
  const billablePrompt = Math.max(0, usage.prompt - cached);
  const cachedRate = pricing.cachedPromptPerMTok ?? pricing.promptPerMTok;
  const reasoningRate = pricing.reasoningPerMTok ?? pricing.completionPerMTok;

  return (
    (billablePrompt * pricing.promptPerMTok +
      cached * cachedRate +
      usage.completion * pricing.completionPerMTok +
      reasoning * reasoningRate) /
    TOKENS_PER_MTOK
  );
}
