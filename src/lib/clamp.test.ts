import { describe, expect, it } from "vitest";
import { clamp } from "./clamp";

describe("clamp", () => {
  it("returns the value inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps below the minimum", () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });

  it("clamps above the maximum", () => {
    expect(clamp(120, 0, 100)).toBe(100);
  });
});
