# Changelog

## Unreleased

Dark-mode visual QA: every story rendered in both themes, in jsdom and in a
real browser with axe colour-contrast, and every defect found fixed.

- Buttons and the composer textarea now set their own background, text colour
  and border from tokens. Without preflight they kept the browser's
  `ButtonFace` grey and outset border, which ignore `data-theme`: a
  ToolCallTimeline row read near-white text on light grey (1.05:1) in dark mode.
- Every `border` now carries `border-solid`. No preflight sets a border style,
  so `border border-border` on a `div`/`span`/`li` drew nothing — the
  RetrievalTrace row outline, the composer shell, the popover cards and the
  badge outlines were all invisible in both themes.
- `/12` and `/8` tints are now `/10`. Tailwind 3.4 only generates its opacity
  scale, so `bg-accent/12`, `bg-conf-*/12` and `bg-danger/8` emitted no CSS.
- Token values: the retriever palette gains dark-theme values (it had none, so
  dark badges failed contrast at 3.0–3.4:1), and the light `fg-subtle`,
  `accent`, `conf-*` and `retriever-1/3/4` values darken to clear 4.5:1 on the
  surfaces and tints they are used on.
- `src/stories/stories.test.tsx` runs every story under both themes and fails
  on palette colours, off-scale opacity steps, style-less borders and controls
  that keep user-agent colours.
- `npm run screenshots` also writes `docs/dark/`, one dark render per component.

## 0.1.0 — 2026-09-07

First release: all seven components, both styling modes, and the Storybook that
documents them.

- Every block element the components render now zeroes the user agent's own
  margins locally (`<p>`, `<dl>`/`<dd>`, `<pre>`) and every list its bullet and
  inline-start padding. The library ships no preflight by design, so without
  this a Mode A consumer inherited `1em` paragraph margins and a bullet on the
  retriever legend straight from the browser. `src/styles/ua-reset.test.tsx`
  pins the contract per component.
- `docs/media/` holds one screenshot per component, generated from the
  Storybook static build by `npm run screenshots` (`scripts/screenshot-stories.mjs`).
  README rewritten around them, with install instructions and the measured
  bundle-size table.

- `AssistantComposer` — a real `<form>` with a submit button, an autosizing
  textarea, a slash-command combobox, controlled-only attachments validated
  against `accept` / `maxFiles` / `maxFileSize` with `onFileRejected`, and
  paste and drop running that same validation. `Escape` closes the menu and
  never clears the draft.
- `useSlashCommands()` — the command-palette half on its own: menu state, the
  full keyboard matrix and the combobox prop getters, owning no text. `onSelect`
  hands back a pure `replace(text)` the consumer applies to its own state.
- The `atlas-ui` barrel budget moved 42 kB -> 46 kB now that all seven
  components ship in it (measured 44.46 kB). Per-component budgets unchanged.

- `StreamingMessage` — controlled streaming output with a blinking caret, a
  stop/regenerate group that never swaps in place, an optional render-rate
  throttle that always flushes the exact final text, and announcements in a
  separate `sr-only` region rather than on the growing paragraph.
- `completePartialMarkdown()` — closes open code fences, balances trailing
  `**` / `*` / `_` / `` ` `` with a delimiter stack, and drops half-written
  links so mid-stream markdown does not flicker.
- `ToolCallTimeline` — nested agent tool calls as a disclosure tree (not a
  `role="tree"`), with redaction on by default, additive arrow-key shortcuts,
  a `maxDepth` fold row that raises the depth instead of dead-ending, and
  status carried by shape and text as well as colour.
- `CitationChip` — inline citation marker opening a source preview on hover or
  focus, with debounced safe-path close, numeric/dot/text variants, `asChild`,
  and provenance rendered as text.
- `RetrievalTrace` — ranked retrieved chunks as an `<ol>`, with per-retriever
  provenance rendered as text (`bm25 · rank 1 · w 0.6`), hybrid expansion,
  controlled selection, and query-term highlighting that never parses HTML.
- `fromRagfuse()` — converts ragfuse `FusedHit` JSON (snake_case or camelCase)
  into `RetrievedChunk[]`; throws on a hit with no `key`.
- `ConfidenceBadge` — level badge with score, four-shape icon set, and a
  tooltip/popover calibration explainer.
- `TokenMeter` — token usage against a budget with `role="meter"`, threshold
  announcements, and `estimateCost()`.
- Repo skeleton: tsup dual-format build, token layer (`tokens.css`,
  `theme.css`, prebuilt `styles.css` without preflight), Tailwind 3.4 preset,
  `cn` / `formatTokens` / `formatDuration` / `formatCost` / `safeStringify`,
  `useControllableState`.
