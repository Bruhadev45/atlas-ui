import * as React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAutosize } from "./use-autosize";

/**
 * jsdom lays nothing out, so `scrollHeight` is always 0. Stubbing it is what
 * makes the clamp testable at all; the arithmetic is the part worth pinning.
 */
function stubScrollHeight(value: number): void {
  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => value,
  });
}

afterEach(() => {
  Reflect.deleteProperty(HTMLTextAreaElement.prototype, "scrollHeight");
});

interface HarnessProps {
  value?: string;
  minRows?: number;
  maxRows?: number;
  style?: React.CSSProperties;
}

function Harness(props: HarnessProps): React.ReactElement {
  const { value = "", minRows = 1, maxRows = 12, style } = props;
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  useAutosize(ref, value, minRows, maxRows);
  return <textarea ref={ref} aria-label="autosizing" value={value} readOnly style={style} />;
}

const textarea = () => screen.getByRole("textbox") as HTMLTextAreaElement;

/* jsdom reports line-height "normal", so the hook's fallback applies:
   font-size 16px * 1.5 = 24px a row. */
const ROW = 24;

describe("useAutosize", () => {
  it("grows to the content height between the two bounds", () => {
    stubScrollHeight(5 * ROW);
    render(<Harness maxRows={12} />);
    expect(textarea().style.height).toBe(`${5 * ROW}px`);
    expect(textarea().style.overflowY).toBe("hidden");
  });

  it("clamps at maxRows and turns on scrolling past it", () => {
    stubScrollHeight(40 * ROW);
    render(<Harness maxRows={12} />);
    expect(textarea().style.height).toBe(`${12 * ROW}px`);
    expect(textarea().style.overflowY).toBe("auto");
  });

  it("never shrinks below minRows", () => {
    stubScrollHeight(1);
    render(<Harness minRows={3} />);
    expect(textarea().style.height).toBe(`${3 * ROW}px`);
  });

  it("adds padding and borders to both bounds under border-box", () => {
    stubScrollHeight(1);
    render(
      <Harness
        minRows={2}
        style={{ boxSizing: "border-box", paddingTop: 6, paddingBottom: 6 }}
      />
    );
    /* 12px of padding plus the 1px top and bottom borders a textarea gets from
       the user-agent stylesheet — under border-box both count against height. */
    expect(textarea().style.height).toBe(`${2 * ROW + 14}px`);
  });

  it("re-measures when the value changes", () => {
    stubScrollHeight(2 * ROW);
    const { rerender } = render(<Harness value="one line" />);
    expect(textarea().style.height).toBe(`${2 * ROW}px`);

    stubScrollHeight(6 * ROW);
    rerender(<Harness value="one line\nand five more" />);
    expect(textarea().style.height).toBe(`${6 * ROW}px`);
  });
});
