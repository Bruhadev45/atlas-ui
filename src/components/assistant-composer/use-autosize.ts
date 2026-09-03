import * as React from "react";

function px(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Grows a textarea with its content between `minRows` and `maxRows`.
 *
 * `useLayoutEffect` rather than a render-time measurement: the DOM read happens
 * after commit, so server rendering is untouched and the height never flickers
 * through an unclamped frame. CSS `field-sizing: content` replaces all of this
 * once the browser floor allows it (SPEC section 5.7).
 */
export function useAutosize(
  ref: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  minRows: number,
  maxRows: number
): void {
  React.useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const style = window.getComputedStyle(element);
    const lineHeight = px(style.lineHeight, px(style.fontSize, 16) * 1.5);
    const chrome =
      style.boxSizing === "border-box"
        ? px(style.paddingTop, 0) +
          px(style.paddingBottom, 0) +
          px(style.borderTopWidth, 0) +
          px(style.borderBottomWidth, 0)
        : 0;

    const min = lineHeight * minRows + chrome;
    const max = lineHeight * maxRows + chrome;

    /* Reset first: scrollHeight cannot shrink below the current height. */
    element.style.height = "auto";
    const content = element.scrollHeight;
    element.style.height = `${Math.min(Math.max(content, min), max)}px`;
    element.style.overflowY = content > max ? "auto" : "hidden";
  }, [ref, value, minRows, maxRows]);
}
