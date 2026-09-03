# Changelog

## Unreleased

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
