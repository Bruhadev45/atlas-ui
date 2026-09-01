import { describe, expect, it } from "vitest";
import { callDuration, countDescendants, flattenCalls, spellDuration } from "./duration";
import type { ToolCall } from "./tool-call-timeline.types";

const call = (partial: Partial<ToolCall>): ToolCall => ({
  id: "x",
  name: "x",
  status: "ok",
  ...partial,
});

describe("callDuration", () => {
  it("prefers an explicit durationMs over the timestamp pair", () => {
    expect(callDuration(call({ durationMs: 120, startedAt: 0, endedAt: 999 }))).toBe(120);
  });

  it("derives the duration from startedAt and endedAt", () => {
    expect(callDuration(call({ startedAt: 1_000, endedAt: 1_820 }))).toBe(820);
  });

  it("clamps a reversed timestamp pair to zero rather than showing a negative", () => {
    expect(callDuration(call({ startedAt: 1_820, endedAt: 1_000 }))).toBe(0);
  });

  it("is undefined while a call is still running", () => {
    expect(callDuration(call({ status: "running", startedAt: 1_000 }))).toBeUndefined();
  });
});

describe("spellDuration", () => {
  it.each([
    [0, "0 milliseconds"],
    [1, "1 millisecond"],
    [820.4, "820 milliseconds"],
    [1_000, "1 second"],
    [8_240, "8.2 seconds"],
    [82_000, "1 minute 22 seconds"],
    [120_000, "2 minutes"],
    [3_661_000, "61 minutes 1 second"],
  ])("spells %dms as %s", (ms, expected) => {
    expect(spellDuration(ms)).toBe(expected);
  });
});

describe("tree helpers", () => {
  const tree: ToolCall[] = [
    call({ id: "a", name: "a", children: [call({ id: "a1", name: "a1" })] }),
    call({
      id: "b",
      name: "b",
      children: [call({ id: "b1", name: "b1", children: [call({ id: "b1a", name: "b1a" })] })],
    }),
  ];

  it("counts every descendant, not just direct children", () => {
    expect(countDescendants(tree)).toBe(5);
    expect(countDescendants([])).toBe(0);
  });

  it("flattens depth-first, which is execution order", () => {
    expect(flattenCalls(tree).map((c) => c.id)).toEqual(["a", "a1", "b", "b1", "b1a"]);
  });
});
