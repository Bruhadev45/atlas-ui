import { describe, expect, it } from "vitest";
import { formatCost, formatDuration, formatTokens } from "./format";

describe("formatTokens", () => {
  it("abbreviates thousands with one decimal", () => {
    expect(formatTokens(34_500)).toBe("34.5K");
    expect(formatTokens(34_512)).toBe("34.5K");
    expect(formatTokens(1_000)).toBe("1K");
  });

  it("abbreviates millions and billions", () => {
    expect(formatTokens(1_000_000)).toBe("1M");
    expect(formatTokens(2_450_000)).toBe("2.5M");
    expect(formatTokens(2_500_000_000)).toBe("2.5B");
  });

  it("keeps small counts as plain numbers", () => {
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(950)).toBe("950");
  });

  it("drops the decimal for round values", () => {
    expect(formatTokens(128_000)).toBe("128K");
  });

  it("respects the locale for the decimal separator", () => {
    expect(formatTokens(34_500, "de-DE")).toBe("34,5K");
  });

  it("handles negative counts", () => {
    expect(formatTokens(-34_500)).toBe("-34.5K");
  });
});

describe("formatDuration", () => {
  it("renders sub-second durations in milliseconds", () => {
    expect(formatDuration(820)).toBe("820ms");
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("renders seconds with at most one decimal", () => {
    expect(formatDuration(8_200)).toBe("8.2s");
    expect(formatDuration(5_000)).toBe("5s");
  });

  it("renders minutes and seconds", () => {
    expect(formatDuration(82_000)).toBe("1m 22s");
    expect(formatDuration(60_000)).toBe("1m");
  });

  it("renders hours and minutes", () => {
    expect(formatDuration(3_722_000)).toBe("1h 2m");
    expect(formatDuration(3_600_000)).toBe("1h");
  });
});

describe("formatCost", () => {
  it("keeps four fraction digits for sub-unit costs", () => {
    expect(formatCost(0.0092)).toBe("$0.0092");
  });

  it("uses two fraction digits at one unit and above", () => {
    expect(formatCost(1.5)).toBe("$1.50");
    expect(formatCost(12)).toBe("$12.00");
  });

  it("defaults to USD and accepts other currencies and locales", () => {
    expect(formatCost(1.5, "EUR", "de-DE")).toContain("€");
  });
});
