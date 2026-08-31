import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useControllableState, type UseControllableStateParams } from "./use-controllable-state";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useControllableState (uncontrolled)", () => {
  it("starts from defaultProp and updates on set", () => {
    const { result } = renderHook(() =>
      useControllableState<string>({ defaultProp: "compact" })
    );
    expect(result.current[0]).toBe("compact");
    act(() => result.current[1]("expanded"));
    expect(result.current[0]).toBe("expanded");
  });

  it("supports functional updates", () => {
    const { result } = renderHook(() => useControllableState<number>({ defaultProp: 1 }));
    act(() => result.current[1]((prev) => prev + 1));
    act(() => result.current[1]((prev) => prev + 1));
    expect(result.current[0]).toBe(3);
  });

  it("calls onChange with the resolved value", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState<string>({ defaultProp: "a", onChange })
    );
    act(() => result.current[1]("b"));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("does not call onChange when the value does not change", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState<string>({ defaultProp: "a", onChange })
    );
    act(() => result.current[1]("a"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("useControllableState (controlled)", () => {
  it("follows the prop and never owns the value", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      (params: UseControllableStateParams<string>) => useControllableState(params),
      { initialProps: { prop: "compact", defaultProp: "compact", onChange } }
    );
    act(() => result.current[1]("expanded"));
    // Still the controlled prop: the consumer decides.
    expect(result.current[0]).toBe("compact");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("expanded");

    rerender({ prop: "expanded", defaultProp: "compact", onChange });
    expect(result.current[0]).toBe("expanded");
  });

  it("resolves functional updates against the controlled prop", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState<number>({ prop: 10, defaultProp: 0, onChange })
    );
    act(() => result.current[1]((prev) => prev + 5));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(15);
  });
});

describe("useControllableState (development warning)", () => {
  it("warns once when a component flips between controlled and uncontrolled", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { rerender } = renderHook(
      (params: UseControllableStateParams<string>) => useControllableState(params),
      { initialProps: { defaultProp: "a" } as UseControllableStateParams<string> }
    );
    expect(warn).not.toHaveBeenCalled();

    rerender({ prop: "b", defaultProp: "a" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("uncontrolled to controlled");

    // Flipping back does not warn again: once per component instance.
    rerender({ defaultProp: "a" });
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
