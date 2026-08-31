import { describe, expect, it } from "vitest";
import { formatNormalized, formatRawScore, formatWeight } from "./format-score";

describe("formatNormalized", () => {
  it.each([
    [1, "1.00"],
    [0.9843, "0.98"],
    [0.5, "0.50"],
    [0, "0.00"],
  ])("renders %s as %s", (score, expected) => {
    expect(formatNormalized(score)).toBe(expected);
  });
});

describe("formatRawScore", () => {
  it.each([
    [0.0163, "0.0163"],
    [0.01630, "0.0163"],
    [1.5, "1.5"],
    [2, "2"],
    [0, "0"],
    /* Below four decimals, digits matter more than a column of zeros. */
    [0.000_012_3, "0.0000123"],
    [-0.0163, "-0.0163"],
  ])("renders %s as %s", (score, expected) => {
    expect(formatRawScore(score)).toBe(expected);
  });
});

describe("formatWeight", () => {
  it.each([
    [0.6, "0.6"],
    [1, "1"],
    [0.45, "0.45"],
    [0.333, "0.33"],
  ])("renders %s as %s", (weight, expected) => {
    expect(formatWeight(weight)).toBe(expected);
  });
});
