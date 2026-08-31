import "@testing-library/jest-dom/vitest";
import * as axeMatchers from "vitest-axe/matchers";
import type { AxeMatchers } from "vitest-axe";
import { expect, vi } from "vitest";

expect.extend(axeMatchers);

declare module "vitest" {
  // Interface-merging augmentation: the type parameter list must match vitest's
  // own `Assertion<T = any>` declaration exactly, and the "empty" interfaces
  // exist purely to mix the axe matchers in.
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */
  interface Assertion<T = any> extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
  /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type */
}

/* jsdom is missing all four of these; Radix touches each. */

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: readonly number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

vi.stubGlobal(
  "matchMedia",
  vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn().mockReturnValue(false),
  }))
);

Element.prototype.scrollIntoView = vi.fn();

/*
 * Floating UI (via Radix Popover/Tooltip) probes `element.matches(":modal")`
 * and `":popover-open"` in `isTopLayer()` on every position computation.
 * jsdom's selector engine (nwsapi 2.2.x) implements these pseudo-classes by
 * re-entering `matches(":fullscreen")` per candidate, which blows up to tens
 * of millions of calls and turns a single click into a multi-second stall.
 * jsdom has no top-layer support at all, so `false` is always the correct
 * answer; fast-path these selectors and leave everything else untouched.
 */
const originalMatches = Element.prototype.matches;
const TOP_LAYER_SELECTORS = new Set([":modal", ":popover-open", ":fullscreen", ":picture-in-picture"]);
Element.prototype.matches = function matches(this: Element, selectors: string): boolean {
  if (TOP_LAYER_SELECTORS.has(selectors)) return false;
  return originalMatches.call(this, selectors);
};
