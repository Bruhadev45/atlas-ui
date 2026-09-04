import * as React from "react";
import { composeStories } from "@storybook/react";
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import * as citationChip from "../components/citation-chip/citation-chip.stories";
import * as confidenceBadge from "../components/confidence-badge/confidence-badge.stories";
import * as tokenMeter from "../components/token-meter/token-meter.stories";

/**
 * The `play` functions are the keyboard contract from SPEC section 7, written
 * once. Running the stories as portable stories here means `npm test` goes red
 * when a keyboard path or a story regresses — no browser, no second runner.
 */
type PortableStory = React.ComponentType & {
  play?: (context: { canvasElement: HTMLElement }) => Promise<void>;
};

/* composeStories' return type is keyed by the exported story names, so
   Object.entries widens the values to `unknown`. The runtime shape is always a
   component carrying an optional `play`. */
function storiesOf(
  storyModule: Parameters<typeof composeStories>[0]
): [string, PortableStory][] {
  return Object.entries(composeStories(storyModule)) as [string, PortableStory][];
}

function describeStories(
  name: string,
  storyModule: Parameters<typeof composeStories>[0]
): void {
  describe(`${name} stories`, () => {
    it.each(storiesOf(storyModule))(
      "%s renders, and its play function passes",
      async (_key, Story) => {
        const { container } = render(<Story />);
        expect(container.firstElementChild).not.toBeNull();
        /* `userEvent` from @storybook/test is not act-wrapped the way
           @testing-library/react's is, so the whole play function runs inside
           one act() to keep React's update warnings out of the run. */
        await act(async () => {
          await Story.play?.({ canvasElement: container });
        });
      }
    );
  });
}

describeStories("CitationChip", citationChip);
describeStories("ConfidenceBadge", confidenceBadge);
describeStories("TokenMeter", tokenMeter);
