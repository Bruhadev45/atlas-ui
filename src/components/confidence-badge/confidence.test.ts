import { describe, expect, it } from "vitest";
import { confidenceFromScore, defaultConfidenceThresholds } from "./confidence";

describe("defaultConfidenceThresholds", () => {
  it("matches the documented defaults", () => {
    expect(defaultConfidenceThresholds).toEqual({ high: 0.8, medium: 0.6, low: 0.0 });
  });
});

describe("confidenceFromScore", () => {
  it("returns high at and above the high threshold (inclusive boundary)", () => {
    expect(confidenceFromScore(0.8)).toBe("high");
    expect(confidenceFromScore(0.91)).toBe("high");
    expect(confidenceFromScore(1)).toBe("high");
  });

  it("returns medium between the medium and high thresholds", () => {
    expect(confidenceFromScore(0.79)).toBe("medium");
    expect(confidenceFromScore(0.6)).toBe("medium");
  });

  it("returns low below the medium threshold, all the way down", () => {
    expect(confidenceFromScore(0.59)).toBe("low");
    expect(confidenceFromScore(0.1)).toBe("low");
    expect(confidenceFromScore(0)).toBe("low");
    expect(confidenceFromScore(-0.5)).toBe("low");
  });

  it("never returns insufficient for any score", () => {
    for (let score = -0.2; score <= 1.2; score += 0.05) {
      expect(confidenceFromScore(score)).not.toBe("insufficient");
    }
  });

  it("honours partial custom thresholds merged over defaults", () => {
    expect(confidenceFromScore(0.85, { high: 0.9 })).toBe("medium");
    expect(confidenceFromScore(0.9, { high: 0.9 })).toBe("high");
    expect(confidenceFromScore(0.55, { medium: 0.5 })).toBe("medium");
    expect(confidenceFromScore(0.55)).toBe("low");
  });

  it("treats NaN as low rather than throwing", () => {
    expect(confidenceFromScore(Number.NaN)).toBe("low");
  });
});
