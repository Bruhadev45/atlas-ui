import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges Tailwind classes with last-wins semantics", () => {
    expect(cn("p-2 text-fg", "p-4")).toBe("text-fg p-4");
  });

  it("drops falsy conditional values", () => {
    const isActive = false;
    expect(cn("rounded", isActive && "bg-accent", undefined, null)).toBe("rounded");
  });
});
