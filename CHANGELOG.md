# Changelog

## Unreleased

- `CitationChip` — inline citation marker opening a source preview on hover or
  focus, with debounced safe-path close, numeric/dot/text variants, `asChild`,
  and provenance rendered as text.
- `ConfidenceBadge` — level badge with score, four-shape icon set, and a
  tooltip/popover calibration explainer.
- `TokenMeter` — token usage against a budget with `role="meter"`, threshold
  announcements, and `estimateCost()`.
- Repo skeleton: tsup dual-format build, token layer (`tokens.css`,
  `theme.css`, prebuilt `styles.css` without preflight), Tailwind 3.4 preset,
  `cn` / `formatTokens` / `formatDuration` / `formatCost` / `safeStringify`,
  `useControllableState`.
