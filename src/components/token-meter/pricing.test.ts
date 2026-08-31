import { describe, expect, it } from "vitest";
import { estimateCost } from "./pricing";

describe("estimateCost", () => {
  it("bills cached tokens at the cached rate and subtracts them from prompt", () => {
    const cost = estimateCost(
      { prompt: 28_400, completion: 6_112, cached: 24_000 },
      { promptPerMTok: 3, completionPerMTok: 15, cachedPromptPerMTok: 0.3 }
    );
    // (4,400 * 3 + 24,000 * 0.3 + 6,112 * 15) / 1e6
    expect(cost).toBeCloseTo(0.11208, 10);
  });

  it("defaults the cached rate to promptPerMTok (no double counting)", () => {
    const withCache = estimateCost(
      { prompt: 28_400, completion: 6_112, cached: 24_000 },
      { promptPerMTok: 3, completionPerMTok: 15 }
    );
    const withoutCache = estimateCost(
      { prompt: 28_400, completion: 6_112 },
      { promptPerMTok: 3, completionPerMTok: 15 }
    );
    expect(withCache).toBeCloseTo(withoutCache, 10);
    expect(withCache).toBeCloseTo(0.17688, 10);
  });

  it("bills reasoning tokens at completionPerMTok when unpriced", () => {
    const cost = estimateCost(
      { prompt: 1_000, completion: 1_000, reasoning: 500 },
      { promptPerMTok: 3, completionPerMTok: 15 }
    );
    expect(cost).toBeCloseTo((3_000 + 15_000 + 7_500) / 1e6, 10);
  });

  it("bills reasoning tokens at reasoningPerMTok when priced", () => {
    const cost = estimateCost(
      { prompt: 1_000, completion: 1_000, reasoning: 500 },
      { promptPerMTok: 3, completionPerMTok: 15, reasoningPerMTok: 60 }
    );
    expect(cost).toBeCloseTo((3_000 + 15_000 + 30_000) / 1e6, 10);
  });

  it("clamps billable prompt at zero when cached exceeds prompt", () => {
    const cost = estimateCost(
      { prompt: 100, completion: 0, cached: 200 },
      { promptPerMTok: 10, completionPerMTok: 10, cachedPromptPerMTok: 1 }
    );
    expect(cost).toBeCloseTo(200 / 1e6, 10);
  });

  it("returns zero for zero usage", () => {
    expect(estimateCost({ prompt: 0, completion: 0 }, { promptPerMTok: 3, completionPerMTok: 15 })).toBe(0);
  });
});
