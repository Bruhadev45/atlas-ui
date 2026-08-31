# atlas-ui

Opinionated React + TypeScript + Tailwind components for the parts of an AI
application interface that mainstream component libraries do not ship:
streaming output, citations, confidence, tool traces, token budgets, retrieval
provenance, and the composer. It is deliberately **not** a design system — no
buttons, no modals, no reset — so it composes with shadcn/ui, MUI, Mantine, or
your own styles.

**Status: in development — 3 of 7 components.**

| Component | Status |
|---|---|
| `CitationChip` | ready |
| `ConfidenceBadge` | ready |
| `TokenMeter` | ready |
| `ToolCallTimeline`, `RetrievalTrace`, `StreamingMessage`, `AssistantComposer` | planned |

```tsx
import { CitationChip } from "atlas-ui/citation-chip";
import { ConfidenceBadge, confidenceFromScore } from "atlas-ui/confidence-badge";
import { TokenMeter } from "atlas-ui/token-meter";

<p>
  A common object requires shared intent
  <CitationChip
    index={1}
    source={{
      id: "sec-149",
      title: "Indian Penal Code, 1860",
      locator: "§ 149",
      snippet: "Every member of unlawful assembly guilty of offence committed…",
      score: 0.92,
      scoreLabel: "fused",
      retriever: "bm25 + InLegalBERT",
      url: "/corpus/ipc/149",
    }}
  />, not mere presence.
</p>

<ConfidenceBadge level={confidenceFromScore(0.91)} score={0.91} showScore />
<TokenMeter
  usage={{ prompt: 28_400, completion: 6_112, cached: 24_000 }}
  budget={128_000}
  pricing={{ promptPerMTok: 3, completionPerMTok: 15, cachedPromptPerMTok: 0.3 }}
/>
```

The citation preview opens on hover *or* focus. Hover open/close is debounced
so the pointer can travel from the chip to the card's link; a focus-opened
preview never closes on `pointerleave`, only on blur or `Escape`.

Prefer the per-component subpaths (`atlas-ui/confidence-badge`) — they
guarantee you only ship what you import, in every bundler. The barrel
(`atlas-ui`) is the convenience for modern ESM setups.

## Styling — two consumption modes

The library owns no global styles and ships no preflight/reset.

### Mode A — no Tailwind in your app

Import the prebuilt stylesheet once, in your app root:

```ts
import "atlas-ui/styles.css";
```

That file contains the design-token layer plus every utility the components
use, prebuilt with `preflight: false`, so it cannot reset your application.

### Mode B — your app already uses Tailwind

**Tailwind 3.4** — add the preset and let Tailwind scan the library's `dist`:

```js
// tailwind.config.js
import atlasPreset from "atlas-ui/preset";

export default {
  presets: [atlasPreset],
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/atlas-ui/dist/**/*.{js,cjs}", // required
  ],
};
```

```ts
import "atlas-ui/tokens.css";
```

**Tailwind 4** — import the theme mapping and the tokens in your app CSS:

```css
@import "atlas-ui/theme.css";
@import "atlas-ui/tokens.css";
```

Known limitation: a Tailwind 3 consumer using a `prefix` cannot use Mode B
(the `dist` class literals are unprefixed) — use Mode A instead.

Dark mode: add `.dark` or `data-theme="dark"` to any ancestor (usually
`<html>`). Tokens flip in `tokens.css`; there is not a single `dark:` class in
the components.

## License

MIT © Kandimalla Bruhadev
