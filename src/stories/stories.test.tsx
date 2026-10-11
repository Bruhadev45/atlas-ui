import * as React from "react";
import { composeStories } from "@storybook/react";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as assistantComposer from "../components/assistant-composer/assistant-composer.stories";
import * as citationChip from "../components/citation-chip/citation-chip.stories";
import * as confidenceBadge from "../components/confidence-badge/confidence-badge.stories";
import * as retrievalTrace from "../components/retrieval-trace/retrieval-trace.stories";
import * as streamingMessage from "../components/streaming-message/streaming-message.stories";
import * as tokenMeter from "../components/token-meter/token-meter.stories";
import * as toolCallTimeline from "../components/tool-call-timeline/tool-call-timeline.stories";

/**
 * The `play` functions are the keyboard contract from SPEC section 7, written
 * once. Running the stories as portable stories here means `npm test` goes red
 * when a keyboard path or a story regresses — no browser, no second runner.
 *
 * Every story runs twice, once under each `data-theme`, and both runs also
 * check the token contract below.
 */
type PortableStory = React.ComponentType & {
  play?: (context: { canvasElement: HTMLElement }) => Promise<void>;
};

const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

/*
 * Dark mode is nothing but tokens flipping in tokens.css (SPEC section 4), so
 * a colour that does not come from a token cannot follow the theme. jsdom
 * computes no styles, so — as in ua-reset.test.tsx — the assertions read the
 * class list the built CSS then honours.
 */

/** A Tailwind palette colour (`text-gray-500`, `bg-white`) on any variant. */
const PALETTE_COLOR =
  /^(?:[\w-]+:)*(?:bg|text|border(?:-[trblxy])?|ring|ring-offset|outline|fill|stroke|decoration|divide|placeholder|caret|shadow|from|via|to)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3})(?:\/\d+)?$/;

/** A text colour that comes from a token, or is inherited from one. */
const TOKEN_TEXT =
  /^text-(?:fg|accent|success|warning|danger|info|conf-[a-z]+|inherit|current|\[hsl\(var\(--atlas-[\w-]+\)\)\])(?:-[a-z]+)?(?:\/\d+)?$/;

/** A border colour that comes from a token (or deliberately none). */
const TOKEN_BORDER_COLOR =
  /^border-(?:border|transparent|accent|success|warning|danger|info|conf-[a-z]+|\[hsl\(var\(--atlas-[\w-]+\)\)\])(?:-[a-z]+)?(?:\/\d+)?$/;

/**
 * A colour utility with an opacity modifier. Tailwind 3.4 only generates the
 * steps of its opacity scale, so `bg-accent/12` silently emits no CSS at all.
 */
const COLOR_OPACITY = /^(?:[\w-]+:)*(?:bg|text|border|ring|outline|fill|stroke|decoration|divide|shadow)-[\w-]+\/(\d+)$/;
const OPACITY_SCALE = new Set([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);

function offScaleOpacity(c: string): boolean {
  const step = COLOR_OPACITY.exec(c)?.[1];
  return step !== undefined && !OPACITY_SCALE.has(Number(step));
}

/** A border width without a style draws nothing: no preflight sets `solid`. */
const BORDER_WIDTH = /^border(?:-[trblxy])?(?:-[1-9]\d*)?$/;
const BORDER_STYLE = /^border-(?:solid|dashed|dotted|double|none)$/;

function describeEl(el: Element): string {
  return `<${el.tagName.toLowerCase()} class="${el.getAttribute("class") ?? ""}">`;
}

function assertTokenStyling(root: HTMLElement): void {
  for (const el of Array.from(root.querySelectorAll("[class]"))) {
    const offending = Array.from(el.classList).filter((c) => PALETTE_COLOR.test(c));
    expect(offending, `${describeEl(el)} uses a palette colour, not a token`).toEqual([]);
    const unbuilt = Array.from(el.classList).filter(offScaleOpacity);
    expect(unbuilt, `${describeEl(el)} uses an opacity step Tailwind never generates`).toEqual([]);
    const classes = Array.from(el.classList);
    expect(
      !classes.some((c) => BORDER_WIDTH.test(c)) || classes.some((c) => BORDER_STYLE.test(c)),
      `${describeEl(el)} sets a border width but no border style, so draws no border`
    ).toBe(true);
    /* A style applies to all four sides, and an unset side width is `medium`
       (3px), so a one-sided border has to zero the other three first. */
    expect(
      !classes.some((c) => /^border-[trblxy]/.test(c) && BORDER_WIDTH.test(c)) ||
        !classes.some((c) => BORDER_STYLE.test(c)) ||
        classes.includes("border-0"),
      `${describeEl(el)} sets a one-sided border without zeroing the other sides`
    ).toBe(true);
  }

  /* Without preflight, a button or textarea keeps the user agent's
     ButtonFace/Field background, its ButtonText colour and its outset or inset
     border — light-theme system colours that ignore data-theme entirely. Each
     one has to set all three from tokens (or zero the border). */
  for (const el of Array.from(root.querySelectorAll("button, textarea"))) {
    const classes = Array.from(el.classList);
    expect(
      classes.some((c) => c.startsWith("bg-")),
      `${describeEl(el)} keeps the user-agent background`
    ).toBe(true);
    expect(
      classes.some((c) => TOKEN_TEXT.test(c)),
      `${describeEl(el)} keeps the user-agent text colour`
    ).toBe(true);
    expect(
      classes.includes("border-0") ||
        (classes.includes("border-solid") && classes.some((c) => TOKEN_BORDER_COLOR.test(c))),
      `${describeEl(el)} keeps the user-agent border`
    ).toBe(true);
  }
}

/* composeStories' return type is keyed by the exported story names, so
   Object.entries widens the values to `unknown`. The runtime shape is always a
   component carrying an optional `play`. */
function storiesOf(
  storyModule: Parameters<typeof composeStories>[0]
): [string, Theme, PortableStory][] {
  const stories = Object.entries(composeStories(storyModule)) as [string, PortableStory][];
  return stories.flatMap(([key, Story]) =>
    THEMES.map((theme): [string, Theme, PortableStory] => [key, theme, Story])
  );
}

function describeStories(
  name: string,
  storyModule: Parameters<typeof composeStories>[0]
): void {
  describe(`${name} stories`, () => {
    it.each(storiesOf(storyModule))(
      "%s (%s theme) renders, its play function passes, and it styles only with tokens",
      async (_key, theme, Story) => {
        const { container, baseElement } = render(
          <div data-theme={theme}>
            <Story />
          </div>
        );
        expect(container.firstElementChild?.firstElementChild).not.toBeNull();
        /* `userEvent` from @storybook/test is not act-wrapped the way
           @testing-library/react's is, so the whole play function runs inside
           one act() to keep React's update warnings out of the run. */
        await act(async () => {
          await Story.play?.({ canvasElement: container });
        });
        // Radix portals popovers out of `container`, so scan the whole body.
        assertTokenStyling(baseElement);
      }
    );
  });
}

describeStories("AssistantComposer", assistantComposer);
describeStories("CitationChip", citationChip);
describeStories("ConfidenceBadge", confidenceBadge);
describeStories("RetrievalTrace", retrievalTrace);
describeStories("StreamingMessage", streamingMessage);
describeStories("TokenMeter", tokenMeter);
describeStories("ToolCallTimeline", toolCallTimeline);
