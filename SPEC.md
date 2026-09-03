# atlas-ui — Architecture & Component API Specification

**Version:** 0.1.0 (draft)
**Author:** Kandimalla Bruhadev
**Status:** Approved for build
**Target:** shippable v0.1.0 in 7 working days, one engineer
**License:** MIT

---

## 1. Purpose & Positioning

`atlas-ui` is a small, opinionated React + TypeScript + Tailwind component library for the parts of an AI application interface that no mainstream component library ships: streaming output, citations, confidence, tool traces, token budgets, retrieval provenance, and the composer.

It is deliberately **not** a design system. It does not ship buttons, inputs, modals, tables, or a layout primitive. Consumers already have shadcn/ui, MUI, Mantine, or their own. `atlas-ui` fills the gap those libraries leave and composes with all of them because it owns no global styles and no reset.

### Design commitments

| Commitment | Consequence |
|---|---|
| No runtime CSS-in-JS | Static Tailwind classes only; the only inline styles are CSS custom properties (§4.4) |
| No headless-UI dependency heavier than Radix primitives | 4 Radix packages, each justified in §3.3 |
| Every component keyboard-operable | No hover-only affordance anywhere; §12 audit checklist |
| Dark mode via CSS variables, not duplicate classes | Zero `dark:` classes in component source; tokens flip in `tokens.css` |
| The library owns presentation, never transport | No fetch, no SSE, no state machine, no upload logic |
| Colour is never the only signal | Every status carries text and, where useful, a shape |

### Non-goals for v0.1.0

Explicitly out of scope, to protect the one-week budget:

- A markdown renderer (render-prop instead — §5.1)
- A chat message list / virtualisation
- Automatic citation numbering across a document tree (v0.2, `CitationProvider`)
- `role="tree"` keyboard semantics for `ToolCallTimeline` (v0.3, opt-in — §5.4)
- Animation library, theming UI, RTL-specific layouts (RTL works via logical properties but is untested)
- i18n framework integration (every component takes a `labels` prop instead)

### npm name

`atlas-ui` is likely taken. Check before day 1; the fallback is `@bruhadev/atlas-ui`. All subpath examples below use `atlas-ui` and are mechanically renameable.

---

## 2. Repository Architecture

### 2.1 File tree

```
atlas-ui/
├── .github/
│   └── workflows/
│       ├── ci.yml                      # typecheck, lint, test, build, publint, attw, size-limit
│       └── release.yml                 # tag -> npm publish --provenance
├── .storybook/
│   ├── main.ts
│   ├── preview.tsx
│   └── preview.css                     # @tailwind directives + atlas tokens, Storybook only
├── src/
│   ├── index.ts                        # barrel; re-exports every component + type + util
│   ├── types.ts                        # shared public types (CSSVars, Density, Size, ...)
│   │
│   ├── components/
│   │   ├── streaming-message/
│   │   │   ├── index.ts
│   │   │   ├── streaming-message.tsx
│   │   │   ├── streaming-message.types.ts
│   │   │   ├── stream-cursor.tsx
│   │   │   ├── stream-actions.tsx
│   │   │   ├── partial-markdown.ts     # completePartialMarkdown()
│   │   │   ├── streaming-message.stories.tsx
│   │   │   ├── partial-markdown.test.ts
│   │   │   └── streaming-message.test.tsx
│   │   ├── citation-chip/
│   │   │   ├── index.ts
│   │   │   ├── citation-chip.tsx
│   │   │   ├── citation-preview.tsx
│   │   │   ├── citation-chip.types.ts
│   │   │   ├── citation-chip.stories.tsx
│   │   │   └── citation-chip.test.tsx
│   │   ├── confidence-badge/
│   │   │   ├── index.ts
│   │   │   ├── confidence-badge.tsx
│   │   │   ├── confidence-icons.tsx
│   │   │   ├── confidence.ts           # confidenceFromScore(), thresholds
│   │   │   ├── confidence-badge.types.ts
│   │   │   ├── confidence-badge.stories.tsx
│   │   │   └── confidence-badge.test.tsx
│   │   ├── tool-call-timeline/
│   │   │   ├── index.ts
│   │   │   ├── tool-call-timeline.tsx
│   │   │   ├── tool-call-node.tsx
│   │   │   ├── tool-call-status.tsx
│   │   │   ├── tool-call-timeline.types.ts
│   │   │   ├── tool-call-timeline.stories.tsx
│   │   │   └── tool-call-timeline.test.tsx
│   │   ├── token-meter/
│   │   │   ├── index.ts
│   │   │   ├── token-meter.tsx
│   │   │   ├── token-meter-bar.tsx
│   │   │   ├── pricing.ts              # estimateCost()
│   │   │   ├── token-meter.types.ts
│   │   │   ├── token-meter.stories.tsx
│   │   │   └── token-meter.test.tsx
│   │   ├── retrieval-trace/
│   │   │   ├── index.ts
│   │   │   ├── retrieval-trace.tsx
│   │   │   ├── retrieval-chunk.tsx
│   │   │   ├── provenance-badges.tsx
│   │   │   ├── retriever-legend.tsx
│   │   │   ├── retrieval-trace.types.ts
│   │   │   ├── retrieval-trace.stories.tsx
│   │   │   └── retrieval-trace.test.tsx
│   │   └── assistant-composer/
│   │       ├── index.ts
│   │       ├── assistant-composer.tsx
│   │       ├── composer-attachments.tsx
│   │       ├── composer-command-menu.tsx
│   │       ├── assistant-composer.types.ts
│   │       ├── assistant-composer.stories.tsx
│   │       └── assistant-composer.test.tsx
│   │
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── use-controllable-state.ts
│   │   ├── use-expanded-set.ts
│   │   ├── use-throttled-value.ts
│   │   ├── use-autosize-textarea.ts
│   │   ├── use-slash-commands.ts
│   │   └── use-slash-commands.test.ts
│   │
│   ├── lib/
│   │   ├── cn.ts                       # clsx + tailwind-merge
│   │   ├── format.ts                   # formatTokens, formatDuration, formatCost, formatBytes
│   │   ├── safe-json.ts                # bounded stringify + key redaction
│   │   ├── highlight.ts                # term highlight -> ReactNode[], never innerHTML
│   │   ├── clamp.ts
│   │   └── adapters/
│   │       ├── index.ts
│   │       ├── ragfuse.ts              # fromRagfuse()
│   │       └── ragfuse.test.ts
│   │
│   └── styles/
│       ├── tokens.css                  # :root + dark vars + the only hand-written CSS layer
│       ├── theme.css                   # Tailwind v4 @theme inline mapping
│       └── build.css                   # tokens + @tailwind directives -> dist/styles.css
│
├── tailwind/
│   └── preset.ts                       # Tailwind v3.4 preset (Config partial)
├── tsup.config.ts
├── tailwind.build.config.ts            # builds the prebuilt dist/styles.css
├── vitest.config.ts
├── vitest.setup.ts
├── tsconfig.json
├── tsconfig.build.json
├── eslint.config.js
├── .size-limit.json
├── package.json
├── README.md
├── CHANGELOG.md
└── LICENSE
```

Rule enforced by review: **no source file over 300 lines**. If a component file grows past that, extract a sibling (`*-node.tsx`, `*-bar.tsx`) rather than adding sections.

### 2.2 Build tooling — decision: tsup

**Chosen: `tsup`.**

| | tsup | Vite library mode |
|---|---|---|
| Multi-entry ESM + CJS + per-entry `.d.ts` | One config array, `dts: true` | Needs `vite-plugin-dts` + Rollup `preserveModules` tuning |
| CSS pipeline | None (we don't need one) | Strong — but we ship CSS via the Tailwind CLI, not the bundler |
| Dev loop / HMR | None | Strong — but Storybook 8 already gives us this |
| Cold build (7 entries) | ~1–2 s esbuild + ~4 s dts | ~6–10 s |
| Config surface | ~40 lines | ~90 lines + 2 plugins |

Rationale: the single strongest argument for Vite lib mode is its CSS and asset pipeline, and this library deliberately has neither — CSS is produced by the Tailwind CLI into a static file, and there are no assets (icons are inline SVG components). The second argument is the dev server, which Storybook already provides using the Vite builder. What remains is multi-entry bundling with declarations, which is tsup's core competency and one config file. For a solo one-week build, fewer moving parts wins.

Known drawbacks, accepted:
- tsup's `dts` step (rollup-plugin-dts) is the slowest part of the build. Mitigation: all shared public types live in `src/types.ts` and each component's `*.types.ts`, so declaration graphs stay shallow.
- tsup is in low-maintenance mode; `tsdown` (Rolldown) is the designated successor with a near-identical config. Migration is a follow-up chore, not a v0.1.0 risk. Revisit at v0.3.

**`"use client"` handling.** esbuild strips directives, which breaks Next.js App Router consumers. Solution: two tsup configs in one array — a client config with a `"use client"` banner over all component entries, and a Node config for the Tailwind preset with no banner.

```ts
// tsup.config.ts
import { defineConfig } from "tsup";

const componentEntries = {
  index: "src/index.ts",
  "streaming-message": "src/components/streaming-message/index.ts",
  "citation-chip": "src/components/citation-chip/index.ts",
  "confidence-badge": "src/components/confidence-badge/index.ts",
  "tool-call-timeline": "src/components/tool-call-timeline/index.ts",
  "token-meter": "src/components/token-meter/index.ts",
  "retrieval-trace": "src/components/retrieval-trace/index.ts",
  "assistant-composer": "src/components/assistant-composer/index.ts",
  hooks: "src/hooks/index.ts",
  utils: "src/lib/index.ts",
};

export default defineConfig([
  {
    entry: componentEntries,
    format: ["esm", "cjs"],
    dts: true,
    splitting: true,        // shared chunks across entries, no duplicated helpers
    treeshake: true,
    sourcemap: true,
    clean: true,
    target: "es2021",
    external: ["react", "react-dom"],
    banner: { js: '"use client";' },
  },
  {
    entry: { preset: "tailwind/preset.ts" },
    format: ["esm", "cjs"],
    dts: true,
    platform: "node",
    target: "node18",
    clean: false,
  },
]);
```

`splitting: true` matters: without it, `cn`, `formatTokens`, and `useControllableState` would be inlined into every entry, and a consumer importing three components would ship three copies.

CSS is produced separately:

```jsonc
// package.json scripts (excerpt)
{
  "build:css": "tailwindcss -c tailwind.build.config.ts -i src/styles/build.css -o dist/styles.css --minify && cp src/styles/tokens.css src/styles/theme.css dist/",
  "build": "tsup && npm run build:css"
}
```

`tailwind.build.config.ts` sets `corePlugins: { preflight: false }`. **Shipping preflight in a library stylesheet would reset the consumer's application.** This is the single most common packaging bug in Tailwind component libraries and it is non-negotiable.

### 2.3 package.json

```jsonc
{
  "name": "atlas-ui",
  "version": "0.1.0",
  "description": "Opinionated React components for AI application interfaces: streaming, citations, confidence, tool traces, token budgets, retrieval provenance.",
  "author": "Kandimalla Bruhadev",
  "license": "MIT",
  "type": "module",
  "sideEffects": ["*.css"],
  "files": ["dist", "README.md", "CHANGELOG.md", "LICENSE"],
  "engines": { "node": ">=18" },

  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",

  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./streaming-message": {
      "types": "./dist/streaming-message.d.ts",
      "import": "./dist/streaming-message.js",
      "require": "./dist/streaming-message.cjs"
    },
    "./citation-chip": {
      "types": "./dist/citation-chip.d.ts",
      "import": "./dist/citation-chip.js",
      "require": "./dist/citation-chip.cjs"
    },
    "./confidence-badge": {
      "types": "./dist/confidence-badge.d.ts",
      "import": "./dist/confidence-badge.js",
      "require": "./dist/confidence-badge.cjs"
    },
    "./tool-call-timeline": {
      "types": "./dist/tool-call-timeline.d.ts",
      "import": "./dist/tool-call-timeline.js",
      "require": "./dist/tool-call-timeline.cjs"
    },
    "./token-meter": {
      "types": "./dist/token-meter.d.ts",
      "import": "./dist/token-meter.js",
      "require": "./dist/token-meter.cjs"
    },
    "./retrieval-trace": {
      "types": "./dist/retrieval-trace.d.ts",
      "import": "./dist/retrieval-trace.js",
      "require": "./dist/retrieval-trace.cjs"
    },
    "./assistant-composer": {
      "types": "./dist/assistant-composer.d.ts",
      "import": "./dist/assistant-composer.js",
      "require": "./dist/assistant-composer.cjs"
    },
    "./hooks": {
      "types": "./dist/hooks.d.ts",
      "import": "./dist/hooks.js",
      "require": "./dist/hooks.cjs"
    },
    "./utils": {
      "types": "./dist/utils.d.ts",
      "import": "./dist/utils.js",
      "require": "./dist/utils.cjs"
    },
    "./preset": {
      "types": "./dist/preset.d.ts",
      "import": "./dist/preset.js",
      "require": "./dist/preset.cjs"
    },
    "./styles.css": "./dist/styles.css",
    "./tokens.css": "./dist/tokens.css",
    "./theme.css": "./dist/theme.css",
    "./package.json": "./package.json"
  },

  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0",
    "tailwindcss": ">=3.4.0"
  },
  "peerDependenciesMeta": {
    "tailwindcss": { "optional": true }
  },

  "dependencies": {
    "@radix-ui/react-popover": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "@radix-ui/react-collapsible": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.0"
  },

  "devDependencies": {
    "@storybook/react-vite": "^8.4.0",
    "@storybook/addon-essentials": "^8.4.0",
    "@storybook/addon-a11y": "^8.4.0",
    "@storybook/addon-themes": "^8.4.0",
    "@storybook/test": "^8.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@vitest/coverage-v8": "^2.1.0",
    "vitest-axe": "^0.1.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0",
    "tsup": "^8.3.0",
    "typescript": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "size-limit": "^11.1.0",
    "publint": "^0.2.0",
    "@arethetypeswrong/cli": "^0.17.0"
  },

  "scripts": {
    "dev": "storybook dev -p 6006",
    "build": "tsup && npm run build:css",
    "build:css": "tailwindcss -c tailwind.build.config.ts -i src/styles/build.css -o dist/styles.css --minify && cp src/styles/tokens.css src/styles/theme.css dist/",
    "build:storybook": "storybook build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --coverage",
    "test:watch": "vitest",
    "lint": "eslint .",
    "size": "size-limit",
    "check:pkg": "publint && attw --pack .",
    "prepublishOnly": "npm run build && npm run check:pkg"
  },

  "keywords": ["react", "tailwind", "ai", "llm", "rag", "chat-ui", "streaming",
               "citations", "components", "typescript", "accessibility"],
  "repository": { "type": "git", "url": "git+https://github.com/Bruhadev45/atlas-ui.git" },
  "homepage": "https://github.com/Bruhadev45/atlas-ui#readme"
}
```

**Why both a barrel and per-component subpaths.** The barrel (`atlas-ui`) is the good DX default and tree-shakes correctly for ESM consumers with a modern bundler. The subpaths exist because (a) CJS consumers get no tree-shaking at all and would pull every component, (b) Next.js server components resolve the whole barrel's `"use client"` boundary, and (c) `optimizePackageImports` behaviour varies by bundler version. Subpaths make the guarantee unconditional. The README documents subpaths as the recommended import style and the barrel as the convenience.

**`"sideEffects": ["*.css"]`** — everything except CSS is pure, so bundlers may drop unreferenced modules, but `import "atlas-ui/styles.css"` is never elided.

### 2.4 peerDependencies strategy

| Package | Placement | Range | Rationale |
|---|---|---|---|
| `react` | peer, required | `>=18.0.0` | Single React instance is mandatory (hooks, context). No upper bound: `useId`, `useSyncExternalStore`, and the `ref`-as-prop change in 19 are all handled; `forwardRef` still works in 19. Re-evaluate at React 20 with a `<20` patch release if needed. |
| `react-dom` | peer, required | `>=18.0.0` | Radix Popover/Tooltip portal through `react-dom`. Genuinely required, not optional. |
| `tailwindcss` | peer, **optional** | `>=3.4.0` | Two consumption modes (§4.5). A consumer using only `atlas-ui/styles.css` must not be forced to install Tailwind. `peerDependenciesMeta.optional` removes the install warning. |
| `@radix-ui/*` | **dependency** | `^1.1.0` | Radix primitives are designed to be nested-safe and are small; making them peers pushes four extra installs onto every consumer for no benefit. npm/pnpm dedupe them against a consumer's own Radix at the same major. |
| `clsx`, `tailwind-merge` | dependency | `^2` | ~1 kB and ~6 kB gzip. `tailwind-merge` is what makes `className` overrides actually win against internal classes; hand-rolling last-wins merging for Tailwind is a project in itself. |

`>=3.4.0` for Tailwind means both v3.4 and v4 must work. §4.5 covers how, with three CSS artifacts totalling under 60 lines of hand-written CSS.

### 2.5 Decision records

**ADR-001 — Ship a render-prop instead of a markdown renderer.**
*Context:* `StreamingMessage` renders LLM output, which is usually markdown.
*Decision:* `renderContent?: (text, ctx) => ReactNode`, defaulting to safe pre-wrapped plain text. Ship `completePartialMarkdown()` as the differentiating utility.
*Consequences:* + Zero parser dependency, no XSS liability owned by the library, consumers keep their existing renderer and plugin set. − Every consumer writes ~5 lines of glue; the README carries a copy-paste `react-markdown` recipe.
*Alternatives:* bundle `react-markdown` + `remark-gfm` (~45 kB gzip, forces a plugin opinion, becomes the library's largest dependency); optional peer dependency (install-time friction, `peerDependenciesMeta` confusion). Rejected both.

**ADR-002 — `CitationChip` uses Popover, not Tooltip.**
*Context:* The source preview card contains a title, snippet, score, and a **link**.
*Decision:* Radix Popover with hover-open wired on top.
*Consequences:* + Interactive content is reachable by keyboard, Escape returns focus, content is in a focus scope. − Hover-open must be hand-wired with open/close delays because Popover has no hover trigger. *Rejected:* Tooltip — WAI-ARIA forbids interactive content in `role="tooltip"`, and keyboard users could never reach the link.

**ADR-003 — Disclosure pattern, not `role="tree"`, for `ToolCallTimeline`.**
*Context:* Nested tool calls form a tree.
*Decision:* Nested `<ul>`/`<li>` with a `<button aria-expanded aria-controls>` per node, plus additive arrow-key shortcuts.
*Consequences:* + Fully keyboard-operable with native Tab order, ~150 lines, no focus manager, no `aria-activedescendant`. − Deep traces mean many tab stops. *Alternatives:* full ARIA tree (correct but is roving tabindex + type-ahead + level/setsize/posinset bookkeeping — a two-day component on its own). Deferred to v0.3 behind `navigation="tree"`.

**ADR-004 — Attachments are controlled-only.**
*Context:* `AssistantComposer` shows attachment chips.
*Decision:* `attachments` is a required-if-used prop with `onAttachmentsAdd` / `onAttachmentRemove`; the component never holds `File` objects in state.
*Consequences:* + The library never owns upload lifecycle, cancellation, retries, or `URL.revokeObjectURL` cleanup — all of which leak memory when a component guesses wrong. − Consumers write a small reducer. Accepted; the README ships one.

---

## 3. Cross-Cutting Conventions

### 3.1 Component contract

Every component:

1. Is a named export, wrapped in `forwardRef`, with `displayName` set.
2. Accepts `className` (merged last via `cn`) and spreads unknown props onto its root element.
3. Exposes state as `data-*` attributes for consumer styling: `data-status`, `data-level`, `data-expanded`, `data-density`, `data-over-budget`.
4. Accepts a `labels` prop — `Partial<XLabels>` merged over English defaults — as the entire i18n story.
5. Renders identically on the server; nothing measures layout during render.
6. Uses **no dynamic class construction** (§4.3).

### 3.2 Controlled vs uncontrolled

One convention library-wide: a prop is controlled if and only if the controlled prop is `!== undefined`. Every stateful surface offers the triple `value` / `defaultValue` / `onValueChange`, implemented by a local hook so we do not depend on `@radix-ui/react-use-controllable-state` (an internal package with no stability guarantee).

```ts
// src/hooks/use-controllable-state.ts
export interface UseControllableStateParams<T> {
  prop?: T;
  defaultProp: T;
  onChange?: (value: T) => void;
}

export function useControllableState<T>(
  params: UseControllableStateParams<T>
): [T, (next: T | ((prev: T) => T)) => void];
```

In development it warns once if a component flips between controlled and uncontrolled.

Summary of per-component decisions (detailed in §5):

| Component | Controlled | Uncontrolled | Rationale |
|---|---|---|---|
| StreamingMessage | `content`, `status` (fully controlled) | internal render throttle buffer only | The library must never own the transport |
| CitationChip | `open` / `defaultOpen` | hybrid | Consumers pin one chip open for tours/tests |
| ConfidenceBadge | `open` / `defaultOpen` for calibration | hybrid | Stateless otherwise |
| ToolCallTimeline | `expandedIds` / `defaultExpandedIds` | hybrid | Deep-linking to a specific call requires control |
| TokenMeter | `variant` / `defaultVariant` | hybrid | Only when `collapsible` |
| RetrievalTrace | `expandedKeys`, `selectedKey` | hybrid for expansion, controlled for selection | Selection drives the consumer's document viewer |
| AssistantComposer | `value` / `defaultValue`; **attachments controlled-only** | hybrid for text | Uncontrolled text avoids re-rendering a long thread per keystroke; files are an app concern (ADR-004) |

### 3.3 Radix primitives — one justification each

| Primitive | Used by | Why it earns its place | What we'd write instead |
|---|---|---|---|
| `@radix-ui/react-popover` | CitationChip | Collision-aware positioning, portal escape from `overflow:hidden` prose containers, focus scope, Escape/outside-dismiss, `aria-controls`/`aria-expanded` wiring | Floating-UI integration + focus trap + dismissable layer: 2 days |
| `@radix-ui/react-tooltip` | ConfidenceBadge calibration | Hover/focus parity, `role="tooltip"` + `aria-describedby`, delay grouping, pointer-vs-keyboard distinction | Marginal cost only — shares `react-popper`, `react-dismissable-layer`, `react-presence` with Popover |
| `@radix-ui/react-collapsible` | ToolCallTimeline, RetrievalTrace, TokenMeter | Correct `aria-expanded`/`aria-controls`/`hidden` wiring plus `--radix-collapsible-content-height` for pure-CSS height animation | ~60 lines and a `ResizeObserver`; the CSS variable is the hard part |
| `@radix-ui/react-slot` | CitationChip `asChild`, composer buttons | The `asChild` composition pattern with no extra DOM node; ~1 kB, no behaviour, no a11y surface | Cloning children with merged refs and handlers, done wrong |

**Deliberately not pulled in:**
- `@radix-ui/react-visually-hidden` — Tailwind's `sr-only` is equivalent.
- `@radix-ui/react-dialog` — no modals in scope.
- A combobox/command library (`cmdk`, Radix Combobox) for slash commands. The combobox here is a menu anchored to a *caret position inside a textarea*, not to a trigger element. Radix's trigger/anchor model doesn't fit, and `cmdk` brings its own filtering and DOM. We ship `useSlashCommands()` returning prop-getters (§5.7) — the brief asks for a hook, and the hook is ~120 lines against a ~14 kB dependency that we would fight.

Estimated added install weight: ~30 kB gzip for the four Radix packages (heavily shared), ~7 kB for `clsx` + `tailwind-merge`.

### 3.4 Shared public types

```ts
// src/types.ts
import type * as React from "react";

/** Lets components set CSS custom properties without an `as` cast. */
export type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

export type Density = "compact" | "comfortable";
export type Size = "sm" | "md" | "lg";
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
export type Side = "top" | "right" | "bottom" | "left";
export type Align = "start" | "center" | "end";
```

All array-valued props are `readonly` (`readonly ToolCall[]`). Mutable arrays are assignable to readonly parameters, so this costs consumers nothing and matches the immutable-data convention used throughout the author's `ragfuse`.

---

## 4. Design Tokens & Styling

### 4.1 Token layer (`src/styles/tokens.css`)

Colours are stored as **space-separated HSL channels**, not finished colours, so Tailwind's `<alpha-value>` works (`bg-conf-high/12` becomes a real translucent fill). This is the only reason to store channels rather than `oklch(...)` strings; oklch channels would work identically if preferred, but HSL is the most portable across Tailwind 3.4 and 4.

```css
/* dist/tokens.css */
:root {
  /* surfaces */
  --atlas-surface:         0 0% 100%;
  --atlas-surface-raised:  0 0% 98%;
  --atlas-surface-sunken:  220 14% 96%;

  /* foreground */
  --atlas-fg:              222 47% 11%;
  --atlas-fg-muted:        215 16% 40%;
  --atlas-fg-subtle:       215 14% 55%;

  /* lines & focus */
  --atlas-border:          220 13% 88%;
  --atlas-ring:            221 83% 53%;

  /* brand */
  --atlas-accent:          221 83% 53%;
  --atlas-accent-fg:       0 0% 100%;

  /* status */
  --atlas-success:         142 71% 33%;
  --atlas-warning:          32 85% 40%;
  --atlas-danger:            0 72% 45%;
  --atlas-info:            199 89% 40%;

  /* confidence (own scale: must stay distinguishable from status colours) */
  --atlas-conf-high:         160 84% 28%;
  --atlas-conf-medium:        38 92% 38%;
  --atlas-conf-low:           14 85% 47%;
  --atlas-conf-insufficient: 215 16% 47%;

  /* retriever default palette, overridable per RetrieverDescriptor.color */
  --atlas-retriever-1: 221 83% 53%;
  --atlas-retriever-2: 271 76% 53%;
  --atlas-retriever-3: 170 70% 36%;
  --atlas-retriever-4:  25 85% 48%;

  /* geometry & motion */
  --atlas-radius:       0.5rem;
  --atlas-radius-sm:    0.3rem;
  --atlas-radius-lg:    0.75rem;
  --atlas-duration:     150ms;
  --atlas-ease:         cubic-bezier(0.2, 0, 0.13, 1);
}

.dark,
[data-theme="dark"] {
  --atlas-surface:         222 47% 8%;
  --atlas-surface-raised:  222 40% 12%;
  --atlas-surface-sunken:  222 47% 6%;

  --atlas-fg:              210 20% 96%;
  --atlas-fg-muted:        215 16% 70%;
  --atlas-fg-subtle:       215 14% 58%;

  --atlas-border:          217 25% 22%;
  --atlas-ring:            217 91% 65%;

  --atlas-accent:          217 91% 62%;
  --atlas-accent-fg:       222 47% 8%;

  --atlas-success:         142 60% 52%;
  --atlas-warning:          38 90% 60%;
  --atlas-danger:            0 78% 66%;
  --atlas-info:            199 89% 62%;

  --atlas-conf-high:         160 70% 48%;
  --atlas-conf-medium:        38 90% 58%;
  --atlas-conf-low:           14 88% 62%;
  --atlas-conf-insufficient: 215 16% 62%;
}

/* System preference, only when the app has not pinned a theme. */
@media (prefers-color-scheme: dark) {
  :root:not(.light):not([data-theme="light"]) {
    /* ...same overrides as .dark... */
  }
}
```

The `.dark` block redefines **only variables**. There is not a single `dark:` utility in any component source file — this is enforced by an ESLint `no-restricted-syntax` rule matching `/\bdark:/` in `className` string literals. That is what "dark mode via CSS variables, not duplicate classes" means operationally, and it halves the class strings in every component.

### 4.2 The only hand-written CSS

Appended to `tokens.css`. Roughly 30 lines total, all of it behaviour that cannot be expressed as a static utility:

```css
@layer components {
  /* StreamingMessage caret */
  .atlas-cursor {
    display: inline-block;
    width: 0.5ch;
    height: 1em;
    translate: 0 0.12em;
    background: hsl(var(--atlas-fg) / 0.75);
    animation: atlas-blink 1.05s steps(2, start) infinite;
  }
  @keyframes atlas-blink { 50% { opacity: 0; } }

  /* TokenMeter fill: a geometric value, not a generated class */
  .atlas-meter-fill {
    width: var(--atlas-meter-fill, 0%);
    transition: width var(--atlas-duration) var(--atlas-ease);
  }

  /* Collapsible height animation via Radix's measured variable */
  .atlas-collapse[data-state="open"]   { animation: atlas-open   var(--atlas-duration) var(--atlas-ease); }
  .atlas-collapse[data-state="closed"] { animation: atlas-closed var(--atlas-duration) var(--atlas-ease); }
  @keyframes atlas-open   { from { height: 0 } to { height: var(--radix-collapsible-content-height) } }
  @keyframes atlas-closed { from { height: var(--radix-collapsible-content-height) } to { height: 0 } }
}

@media (prefers-reduced-motion: reduce) {
  .atlas-cursor { animation: none; opacity: 1; }
  .atlas-meter-fill { transition: none; }
  .atlas-collapse[data-state] { animation: none; }
}
```

Reduced-motion handling lives here rather than in `motion-safe:` utilities so it covers all three cases in one block and cannot be forgotten per-component.

### 4.3 The dynamic-class rule

Tailwind extracts classes by scanning source text. A library consumed in Tailwind mode (§4.5, Mode B) is scanned in its **built `dist/*.js`**, so every class must survive as a complete string literal.

```tsx
// FORBIDDEN — Tailwind cannot see `text-conf-high`
<span className={`text-conf-${level}`} />

// REQUIRED — static lookup map, every literal present in the bundle
const levelClass: Record<ConfidenceLevel, string> = {
  high:         "text-conf-high bg-conf-high/12 border-conf-high/25",
  medium:       "text-conf-medium bg-conf-medium/12 border-conf-medium/25",
  low:          "text-conf-low bg-conf-low/12 border-conf-low/25",
  insufficient: "text-conf-insufficient bg-conf-insufficient/12 border-conf-insufficient/25",
};
<span className={cn("...", levelClass[level], className)} />
```

Enforced by an ESLint rule banning template literals and string concatenation inside `className`. This is the most likely way to ship a silently broken v0.1.0, so it gets a lint rule rather than a code-review habit.

### 4.4 Permitted inline styles

Inline `style` is used in exactly two places, both setting a **CSS custom property or a single geometric value** — never generating rules, never injecting a stylesheet. This is why the "no runtime CSS-in-JS" constraint holds.

```tsx
// TokenMeter fill percentage
<div className="atlas-meter-fill h-full rounded-full bg-accent"
     style={{ "--atlas-meter-fill": `${pct}%` } satisfies CSSVars} />

// RetrievalTrace per-retriever colour, unknowable at build time
<span className="border-[hsl(var(--atlas-retriever))] text-[hsl(var(--atlas-retriever))]"
      style={{ "--atlas-retriever": retriever.color ?? fallback } satisfies CSSVars} />
```

### 4.5 Shipping the tokens — three artifacts, two modes

| Artifact | Consumer | Contents |
|---|---|---|
| `atlas-ui/styles.css` | **Mode A — no Tailwind.** Import once in the app root. | Token layer + all utilities used by the library, prebuilt, `preflight: false`. Budget: ≤ 12 kB gzip. |
| `atlas-ui/preset` + `atlas-ui/tokens.css` | **Mode B — Tailwind 3.4.** Add preset to `tailwind.config`, import `tokens.css`. | Semantic colour scale mapped to `var()`; utilities deduped with the app's own. |
| `atlas-ui/theme.css` + `atlas-ui/tokens.css` | **Mode B — Tailwind 4.** `@import` both in the app CSS. | `@theme inline` mapping, ~20 lines. |

```ts
// tailwind/preset.ts  (Tailwind 3.4)
import type { Config } from "tailwindcss";

const c = (name: string) => `hsl(var(--atlas-${name}) / <alpha-value>)`;

export const atlasPreset = {
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        surface: { DEFAULT: c("surface"), raised: c("surface-raised"), sunken: c("surface-sunken") },
        fg:      { DEFAULT: c("fg"), muted: c("fg-muted"), subtle: c("fg-subtle") },
        border:  c("border"),
        ring:    c("ring"),
        accent:  { DEFAULT: c("accent"), fg: c("accent-fg") },
        success: c("success"),
        warning: c("warning"),
        danger:  c("danger"),
        info:    c("info"),
        conf: {
          high: c("conf-high"), medium: c("conf-medium"),
          low: c("conf-low"), insufficient: c("conf-insufficient"),
        },
      },
      borderRadius: {
        DEFAULT: "var(--atlas-radius)",
        sm: "var(--atlas-radius-sm)",
        lg: "var(--atlas-radius-lg)",
      },
      transitionTimingFunction: { atlas: "var(--atlas-ease)" },
      transitionDuration: { atlas: "var(--atlas-duration)" },
    },
  },
} satisfies Partial<Config>;

export default atlasPreset;
```

```js
// consumer tailwind.config.js (Tailwind 3.4)
import atlasPreset from "atlas-ui/preset";

export default {
  presets: [atlasPreset],
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/atlas-ui/dist/**/*.{js,cjs}",  // required for Mode B
  ],
};
```

```css
/* atlas-ui/theme.css — Tailwind 4 */
@theme inline {
  --color-surface:        hsl(var(--atlas-surface));
  --color-surface-raised: hsl(var(--atlas-surface-raised));
  --color-surface-sunken: hsl(var(--atlas-surface-sunken));
  --color-fg:             hsl(var(--atlas-fg));
  --color-fg-muted:       hsl(var(--atlas-fg-muted));
  --color-fg-subtle:      hsl(var(--atlas-fg-subtle));
  --color-border:         hsl(var(--atlas-border));
  --color-ring:           hsl(var(--atlas-ring));
  --color-accent:         hsl(var(--atlas-accent));
  --color-accent-fg:      hsl(var(--atlas-accent-fg));
  --color-conf-high:         hsl(var(--atlas-conf-high));
  --color-conf-medium:       hsl(var(--atlas-conf-medium));
  --color-conf-low:          hsl(var(--atlas-conf-low));
  --color-conf-insufficient: hsl(var(--atlas-conf-insufficient));
  --radius: var(--atlas-radius);
}
@source "../node_modules/atlas-ui/dist";
```

**Known limitation, documented in the README:** a Tailwind 3 consumer using a `prefix` cannot use Mode B, because our `dist` class literals are unprefixed. Those consumers use Mode A. Recording the limitation is cheaper than solving it.

### 4.6 Focus and contrast

- Every interactive element uses one shared class string: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface`. Focus is never removed and never left at browser default over a coloured surface.
- Contrast targets: 4.5:1 for text, 3:1 for UI boundaries and the meter fill, in both themes. Verified once per release with the Storybook a11y addon plus a Playwright + axe pass over every story (§8.3), because axe in jsdom cannot compute contrast without layout.

---

## 5. Components

Each section gives: the exact props, the controlled/uncontrolled decision, a11y requirements, token usage, and usage examples.

---

### 5.1 `StreamingMessage`

Renders LLM output as it arrives, with a caret, markdown that does not flicker on half-written syntax, and stop/regenerate affordances.

#### Props

```ts
// src/components/streaming-message/streaming-message.types.ts
import type * as React from "react";

export type StreamStatus = "idle" | "streaming" | "complete" | "stopped" | "error";

export interface StreamingMessageLabels {
  stop: string;          // "Stop generating"
  regenerate: string;    // "Regenerate response"
  streaming: string;     // "Generating response"
  stopped: string;       // "Generation stopped"
  error: string;         // "Generation failed"
}

export interface StreamingRenderContext {
  status: StreamStatus;
  /** True while `status === "streaming"`; the text may end mid-token. */
  isPartial: boolean;
}

export interface StreamingMessageProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "content"> {
  /** The text received so far. Always fully controlled. */
  content: string;
  /** @default "complete" */
  status?: StreamStatus;
  /**
   * Renders `content` to React nodes. Receives text already repaired by
   * `completePartialMarkdown` when `repairPartialMarkdown` is on.
   * @default plain text in a whitespace-preserving block
   */
  renderContent?: (text: string, ctx: StreamingRenderContext) => React.ReactNode;
  /** Caret shown while streaming. `true` = default caret, or supply a node. @default true */
  cursor?: boolean | React.ReactNode;
  /** Close unterminated code fences and inline marks before rendering. @default true */
  repairPartialMarkdown?: boolean;
  /** Cap render rate for fast streams. 0 disables. Never changes final content. @default 0 */
  throttleMs?: number;
  /** Shown while streaming. Omit to hide the stop button. */
  onStop?: () => void;
  /** Shown on complete/stopped/error. Omit to hide the regenerate button. */
  onRegenerate?: () => void;
  /** Rendered in place of content when `status === "error"`. */
  error?: React.ReactNode;
  /** Extra affordances (copy, thumbs) rendered beside stop/regenerate. */
  actions?: React.ReactNode;
  /** Screen-reader announcement strategy. @default "polite" */
  announce?: "off" | "polite";
  /** What to announce. @default "complete" */
  announceOn?: "complete" | "sentence";
  labels?: Partial<StreamingMessageLabels>;
}

export declare const StreamingMessage: React.ForwardRefExoticComponent<
  StreamingMessageProps & React.RefAttributes<HTMLDivElement>
>;
```

```ts
// src/components/streaming-message/partial-markdown.ts
export interface PartialMarkdownOptions {
  /** Append a closing ``` when a fence is open. @default true */
  closeCodeFences?: boolean;
  /** Balance trailing `**`, `*`, `_`, `` ` ``. @default true */
  closeInlineMarks?: boolean;
  /** Drop a trailing half-written `[text](htt` so no broken link flashes. @default true */
  hideDanglingLink?: boolean;
}

/** Pure. Returns text safe to hand to a markdown renderer mid-stream. */
export function completePartialMarkdown(
  text: string,
  options?: PartialMarkdownOptions
): string;
```

#### Controlled vs uncontrolled

**Fully controlled.** `content` and `status` are props with no `default*` counterparts. The library must never own the transport — consumers stream via the Vercel AI SDK, a raw `ReadableStream`, LangChain callbacks, or WebSocket, and a component that owned a buffer would fight all of them.

The one piece of internal state is the `throttleMs` render buffer: when set, the component renders a trailing snapshot of `content` at most every `throttleMs`, and **always flushes to the exact final `content` on the transition out of `"streaming"`**. It is a render-rate limiter, never a source of truth.

#### Accessibility

The critical decision: **the streaming text container is not a live region.** Marking the token stream `aria-live="polite"` causes screen readers to re-announce the growing paragraph on every chunk, which is unusable. Instead:

- Content container: `aria-busy={status === "streaming"}`, `data-status={status}`. No `role`.
- A separate `sr-only` live region: `<div aria-live="polite" aria-atomic="true">`, populated by the `announceOn` strategy:
  - `"complete"` (default) — empty during streaming; set once to the full text on completion.
  - `"sentence"` — flushes each sentence as it terminates (`/[.!?]["')\]]?\s/`), for long generations where waiting is worse than chunking.
  - `announce="off"` — the region is not rendered; use when the consumer owns announcements at the thread level.
- Status transitions to `stopped` / `error` always announce, regardless of `announceOn`.
- The caret is `aria-hidden="true"` and `user-select: none` so copying the message never picks it up.
- Stop and regenerate are real `<button type="button">` elements in DOM order **after** the content, so tabbing through a thread reaches text then controls. They are never the same element and never swap in place (which would move focus unexpectedly mid-stream): stop unmounts, regenerate mounts, both inside a stable `<div role="group" aria-label>` wrapper.
- No `role` is claimed on the root. The README documents the recommended wrapper — `<ol role="list">` of `<li>` per turn, or `role="log"` on the thread — because the component cannot know whether it is one message among many.
- Reduced motion: caret blink disabled via §4.2.

#### Token usage

`text-fg`, `leading-relaxed`, code blocks `bg-surface-sunken text-fg`, `rounded`, buttons `border border-border text-fg-muted hover:bg-surface-raised`, error region `text-danger border-danger/30 bg-danger/8`, caret `hsl(var(--atlas-fg) / 0.75)`.

#### Usage

```tsx
// 1. JurisGPT answer pane, Vercel AI SDK
import { StreamingMessage } from "atlas-ui/streaming-message";
import { useChat } from "ai/react";

function AnswerPane() {
  const { messages, isLoading, stop, reload } = useChat({ api: "/api/ask" });
  const last = messages.at(-1);

  return (
    <StreamingMessage
      content={last?.content ?? ""}
      status={isLoading ? "streaming" : "complete"}
      onStop={stop}
      onRegenerate={reload}
      className="max-w-prose"
    />
  );
}
```

```tsx
// 2. Markdown with citations rendered inline (react-markdown stays the consumer's choice)
import { StreamingMessage } from "atlas-ui/streaming-message";
import { CitationChip } from "atlas-ui/citation-chip";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

<StreamingMessage
  content={answer}
  status={status}
  announceOn="sentence"
  throttleMs={50}
  renderContent={(text) => (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        // [[cite:sec-149]] emitted by the model becomes a chip
        sup: ({ children }) => {
          const source = sources[String(children)];
          return source ? <CitationChip source={source} /> : <sup>{children}</sup>;
        },
      }}
    >
      {text}
    </Markdown>
  )}
/>
```

```tsx
// 3. Error state with retry, HRMS assistant
<StreamingMessage
  content={partial}
  status="error"
  error={<>The assistant could not reach the HR knowledge base. Your draft was kept.</>}
  onRegenerate={retry}
  labels={{ regenerate: "Try again" }}
/>
```

---

### 5.2 `CitationChip`

An inline marker that opens a source preview on hover **or** focus.

#### Props

```ts
// src/components/citation-chip/citation-chip.types.ts
import type * as React from "react";
import type { Align, Side } from "../../types";

export interface CitationSource {
  id: string;
  title: string;
  /** Quoted passage. Rendered as text; never parsed as HTML. */
  snippet?: string;
  url?: string;
  /** Relevance in 0..1. Rendered as a percentage plus a decorative bar. */
  score?: number;
  /** What `score` measures, e.g. "fused", "cosine", "bm25". */
  scoreLabel?: string;
  /** Human pin-cite: "§ 149(2)", "10-K p. 31", "Policy 4.2". */
  locator?: string;
  /** Which retriever surfaced this source. */
  retriever?: string;
  /** Extra rows in the preview footer, rendered as key/value text. */
  meta?: Record<string, string>;
}

export interface CitationChipLabels {
  citation: string;        // "Citation"
  relevance: string;       // "relevance"
  openSource: string;      // "Open source"
  from: string;            // "from"
}

export interface CitationChipProps {
  source: CitationSource;
  /** Number shown in the chip. Falls back to `label`, then to a dot. */
  index?: number;
  /** Overrides chip contents entirely. */
  label?: React.ReactNode;

  /** Controlled open state. */
  open?: boolean;
  /** Uncontrolled initial state. @default false */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  /** Open the preview on pointer hover in addition to focus. @default true */
  openOnHover?: boolean;
  /** @default 120 */
  openDelayMs?: number;
  /** @default 160 */
  closeDelayMs?: number;

  /** @default "numeric" */
  variant?: "numeric" | "dot" | "text";
  /** @default "accent" */
  tone?: "neutral" | "accent";

  /** Click-through, e.g. scroll the document viewer to this passage. */
  onActivate?: (source: CitationSource) => void;
  /** Replace the whole preview body. */
  renderPreview?: (source: CitationSource) => React.ReactNode;

  /** @default "top" */
  side?: Side;
  /** @default "center" */
  align?: Align;
  /** Portal target. `null` renders in place (use inside an existing portal). */
  portalContainer?: HTMLElement | null;

  /** Render the trigger as the single child element (Radix Slot). @default false */
  asChild?: boolean;
  children?: React.ReactNode;

  labels?: Partial<CitationChipLabels>;
  className?: string;
  previewClassName?: string;
}

export declare const CitationChip: React.ForwardRefExoticComponent<
  CitationChipProps & React.RefAttributes<HTMLButtonElement>
>;
```

#### Controlled vs uncontrolled

Hybrid, via `useControllableState`. Uncontrolled is the common case. Control matters for product tours, "expand all citations" affordances, and deterministic screenshot tests.

The hover and focus interactions both funnel into the **same** `setOpen` call, so a controlled consumer sees one coherent stream of `onOpenChange` events regardless of input modality.

#### Accessibility

- The trigger is a real `<button type="button">` (Radix `Popover.Trigger`). Hover is an enhancement layered on top; it is never the only way in. This is the reason for ADR-002.
- Accessible name is explicit, because "3" is useless: `aria-label="Citation 3: Indian Penal Code § 149"` composed from `labels.citation`, `index`, `source.title`, and `source.locator`.
- Radix wires `aria-expanded`, `aria-controls`, and `aria-haspopup="dialog"` on the trigger.
- The preview card gets `aria-labelledby` pointing at its own heading node.
- Keyboard: `Tab` reaches the chip; `Enter`/`Space` toggles; `Escape` closes and returns focus to the chip; `Tab` inside the card moves through the source link and then leaves, closing the card. All provided by Popover's focus scope.
- Hover open/close is debounced (`openDelayMs` / `closeDelayMs`) and the close timer is cancelled when the pointer enters the card, so the "safe path" from chip to link works.
- Focus-opened previews **do not** close on `pointerleave` — only on blur or Escape. Mixing the two close paths is the classic bug where a keyboard user's card vanishes because the mouse happened to move.
- `score` renders as text (`"92% relevance"`); the bar is `aria-hidden="true"`.
- `snippet` is rendered as a text node. Never `dangerouslySetInnerHTML` — retrieved chunks are untrusted corpus content.
- Inline layout: `align-super text-[0.72em] leading-none` so chips do not disturb prose line-height.

#### Token usage

Chip: `bg-accent/12 text-accent border border-accent/25 hover:bg-accent/20` (or `fg-muted`/`border` for `tone="neutral"`). Card: `bg-surface-raised text-fg border border-border shadow-lg rounded-lg`. Score bar: `bg-accent` on `bg-surface-sunken`. Retriever pill: `text-fg-subtle bg-surface-sunken`.

#### Usage

```tsx
// 1. JurisGPT — statutory citation inline in an answer
import { CitationChip } from "atlas-ui/citation-chip";

<p>
  A common object under the section requires shared intent
  <CitationChip
    index={1}
    source={{
      id: "sec-149",
      title: "Indian Penal Code, 1860",
      locator: "§ 149",
      snippet: "Every member of unlawful assembly guilty of offence committed in prosecution of common object.",
      score: 0.92,
      scoreLabel: "fused",
      retriever: "bm25 + InLegalBERT",
      url: "/corpus/ipc/149",
    }}
  />, not mere presence.
</p>
```

```tsx
// 2. FinSight — click-through scrolls the filing viewer, preview stays informational
<CitationChip
  index={4}
  side="bottom"
  source={{
    id: "aapl-10k-2024-p31",
    title: "Apple Inc. Form 10-K (FY2024)",
    locator: "p. 31, Segment Operating Performance",
    snippet: "Total net sales increased 2% or $8.0 billion during 2024 compared to 2023.",
    score: 0.87,
    meta: { Filed: "2024-11-01", Section: "Item 7 MD&A" },
  }}
  onActivate={(s) => viewer.scrollTo(s.id)}
/>
```

```tsx
// 3. Custom preview + asChild for a non-numeric trigger
<CitationChip
  asChild
  source={source}
  renderPreview={(s) => <PolicyCard policyId={s.id} title={s.title} />}
>
  <button className="underline decoration-dotted">source</button>
</CitationChip>
```

---

### 5.3 `ConfidenceBadge`

#### Props

```ts
// src/components/confidence-badge/confidence-badge.types.ts
import type * as React from "react";

export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient";

export interface ConfidenceBadgeLabels {
  prefix: string;                                  // "Confidence: "
  levels: Record<ConfidenceLevel, string>;         // High / Medium / Low / Insufficient evidence
  calibration: string;                             // "How this is calculated"
}

export interface ConfidenceBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  level: ConfidenceLevel;
  /** 0..1. Included in the accessible name; shown when `showScore`. */
  score?: number;
  /** @default false */
  showScore?: boolean;
  /** @default "md" */
  size?: "sm" | "md";
  /** @default "soft" */
  variant?: "solid" | "soft" | "outline";
  /** Redundant non-colour cue. `false` removes it. @default true */
  icon?: React.ReactNode | boolean;
  /** Appended to the accessible name, e.g. "based on 5 sources". */
  description?: string;

  /** Calibration explainer. Omit to render no info affordance. */
  calibration?: React.ReactNode;
  /** Tooltip content must be non-interactive; use "popover" for links. @default "tooltip" */
  calibrationAs?: "tooltip" | "popover";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  labels?: Partial<ConfidenceBadgeLabels>;
}

export declare const ConfidenceBadge: React.ForwardRefExoticComponent<
  ConfidenceBadgeProps & React.RefAttributes<HTMLSpanElement>
>;
```

```ts
// src/components/confidence-badge/confidence.ts
export interface ConfidenceThresholds {
  /** score >= high  -> "high"   @default 0.8 */
  high: number;
  /** score >= medium -> "medium" @default 0.6 */
  medium: number;
  /** score >= low -> "low"; below this, still "low" @default 0.0 */
  low: number;
}

export const defaultConfidenceThresholds: ConfidenceThresholds;

/**
 * Maps a 0..1 score onto a level. Never returns "insufficient" —
 * see the note below.
 */
export function confidenceFromScore(
  score: number,
  thresholds?: Partial<ConfidenceThresholds>
): Exclude<ConfidenceLevel, "insufficient">;
```

**Why `insufficient` is not derivable.** `"low"` means "we answered, and we are not confident". `"insufficient"` means "retrieval returned nothing worth answering from, so this is not an answer". They demand different UI and different user action — a low-confidence answer invites verification, an insufficient one invites rephrasing. Collapsing them into one score band is how RAG products end up confidently wrong. `confidenceFromScore` therefore refuses to produce it; the caller sets it explicitly when the retriever comes back empty or below its floor.

#### Controlled vs uncontrolled

Presentation is stateless. Only the calibration disclosure is stateful, hybrid via `open` / `defaultOpen` / `onOpenChange`, matching every other component.

#### Accessibility

- **Never colour-only** (WCAG 1.4.1). The level text is always rendered visibly, and `icon` adds a second, non-colour channel: check (high), half-circle (medium), triangle (low), slash-circle (insufficient). A red/green-colourblind user reads both the word and the shape.
- Accessible name is built from a visually-hidden prefix plus visible text, not `aria-label` on a `<span>` — `aria-label` on non-interactive, non-`role` elements is inconsistently exposed:
  ```tsx
  <span data-level={level}>
    <span className="sr-only">{labels.prefix}</span>
    <Icon aria-hidden="true" />
    {labels.levels[level]}
    {showScore && <span className="tabular-nums">{fmt(score)}</span>}
    {!showScore && score != null && <span className="sr-only"> ({fmt(score)})</span>}
    {description && <span className="sr-only">, {description}</span>}
  </span>
  ```
  Result: "Confidence: High (0.91), based on 5 sources".
- The badge itself stays non-interactive. When `calibration` is supplied, a separate `<button type="button" aria-label={labels.calibration}>` info affordance is rendered next to it. This keeps the badge out of the tab order for the majority of uses.
- `calibrationAs="tooltip"` (default): Radix Tooltip, opens on hover **and** focus, dismisses on Escape, wired with `aria-describedby`. Content must be non-interactive text.
- `calibrationAs="popover"`: Radix Popover, for calibration content containing links (e.g. "see the evaluation report"). Putting a link in a tooltip is unreachable by keyboard; this prop exists to make the correct choice easy rather than to make the wrong one impossible.
- `size="sm"` must still meet a 24×24 CSS px target for the info button (WCAG 2.2 SC 2.5.8) — the button's hit area is padded independently of the badge's visual size.

#### Token usage

`soft`: `bg-conf-{level}/12 text-conf-{level} border border-conf-{level}/25`. `solid`: `bg-conf-{level} text-surface`. `outline`: `border border-conf-{level} text-conf-{level}`. All via a static lookup map (§4.3). The `/12` and `/25` alpha modifiers are exactly why colours are stored as HSL channels (§4.1).

#### Usage

```tsx
// 1. JurisGPT — derived from the fused top score
import { ConfidenceBadge, confidenceFromScore } from "atlas-ui/confidence-badge";

<ConfidenceBadge
  level={confidenceFromScore(topHit.normalizedScore)}
  score={topHit.normalizedScore}
  showScore
  description={`based on ${hits.length} statutes`}
  calibration={
    <>Confidence is the fused RRF score of the top statute, calibrated on a
    120-query human-verified benchmark (Fleiss&rsquo; &kappa;&nbsp;=&nbsp;0.81).</>
  }
/>
```

```tsx
// 2. The refusal path — explicit, not derived
{hits.length === 0 && (
  <ConfidenceBadge
    level="insufficient"
    variant="outline"
    labels={{ levels: { insufficient: "No supporting statute found" } as never }}
    description="the assistant did not answer"
  />
)}
```

```tsx
// 3. FinSight, compact, calibration with a link -> popover
<ConfidenceBadge
  size="sm"
  level="medium"
  score={0.71}
  calibrationAs="popover"
  calibration={
    <p>
      Derived from retrieval agreement across three filings.{" "}
      <a href="/docs/confidence" className="underline">Methodology</a>
    </p>
  }
/>
```

---

### 5.4 `ToolCallTimeline`

#### Props

```ts
// src/components/tool-call-timeline/tool-call-timeline.types.ts
import type * as React from "react";
import type { Density } from "../../types";

export type ToolCallStatus = "pending" | "running" | "ok" | "error" | "cancelled";

export interface ToolCall {
  id: string;
  name: string;
  status: ToolCallStatus;
  /** Serialised safely; see `redactKeys`. */
  args?: unknown;
  result?: unknown;
  /** Human-readable failure message. Shown verbatim. */
  error?: string;
  /** Epoch ms. */
  startedAt?: number;
  endedAt?: number;
  /** Explicit duration wins over `endedAt - startedAt`. */
  durationMs?: number;
  children?: readonly ToolCall[];
  meta?: Record<string, unknown>;
}

export interface ToolCallTimelineLabels {
  args: string;                                   // "Arguments"
  result: string;                                 // "Result"
  error: string;                                  // "Error"
  empty: string;                                  // "No tool calls"
  statuses: Record<ToolCallStatus, string>;       // Pending / Running / Succeeded / Failed / Cancelled
  expand: string;                                 // "Expand"
  collapse: string;                               // "Collapse"
}

export interface ToolCallTimelineProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  calls: readonly ToolCall[];

  /** Controlled expansion. */
  expandedIds?: readonly string[];
  /** Uncontrolled initial expansion. @default [] */
  defaultExpandedIds?: readonly string[];
  onExpandedChange?: (ids: string[]) => void;
  /** Expand everything initially (uncontrolled only). @default false */
  defaultExpandAll?: boolean;
  /** Auto-expand nodes that enter "running". @default true */
  autoExpandRunning?: boolean;

  /** Nesting depth rendered; deeper children collapse into a count. @default 4 */
  maxDepth?: number;
  /** @default "comfortable" */
  density?: Density;
  /** @default true */
  showDurations?: boolean;

  /** Object keys whose values are replaced with "[redacted]". */
  redactKeys?: readonly string[];
  /** Cap on serialised arg/result characters before a "show more" control. @default 2000 */
  maxSerializedChars?: number;

  renderArgs?: (call: ToolCall) => React.ReactNode;
  renderResult?: (call: ToolCall) => React.ReactNode;

  selectedId?: string;
  onSelect?: (call: ToolCall) => void;

  /** Announce status transitions in a polite live region. @default false */
  announceStatusChanges?: boolean;

  emptyState?: React.ReactNode;
  labels?: Partial<ToolCallTimelineLabels>;
}

export declare const ToolCallTimeline: React.ForwardRefExoticComponent<
  ToolCallTimelineProps & React.RefAttributes<HTMLDivElement>
>;
```

```ts
// src/lib/safe-json.ts
export interface SafeStringifyOptions {
  /** @default DEFAULT_REDACT_KEYS */
  redactKeys?: readonly string[];
  /** @default 2000 */
  maxChars?: number;
  /** @default 6 */
  maxDepth?: number;
}

export const DEFAULT_REDACT_KEYS: readonly string[]; // apiKey, api_key, authorization,
                                                     // password, token, secret, cookie,
                                                     // access_token, refresh_token
export interface SafeStringifyResult {
  text: string;
  truncated: boolean;
}

/** Circular-safe, depth-capped, length-capped, key-redacting stringify. */
export function safeStringify(value: unknown, options?: SafeStringifyOptions): SafeStringifyResult;
```

**Redaction is on by default.** Tool-call arguments routinely carry API keys, bearer tokens, and connection strings, and a debug timeline is exactly the surface that ends up in a screenshot or a support ticket. Case-insensitive key matching, replacing values with `"[redacted]"`. Consumers widen the list; they cannot trivially disable it (passing `redactKeys={[]}` works, but it is an explicit act).

#### Controlled vs uncontrolled

Hybrid expansion. Controlled matters for "open the call that failed" deep links and for driving the timeline from a trace viewer. `selectedId` / `onSelect` is controlled-only — selection almost always drives a sibling detail panel, and a component owning that state would immediately desynchronise.

`autoExpandRunning` only writes through `onExpandedChange`; in controlled mode the consumer decides whether to honour it. No silent divergence.

#### Accessibility

Structure (ADR-003 — disclosure pattern, not `role="tree"`):

```html
<div data-density="comfortable">
  <ol>                                <!-- ordered: execution order is meaningful -->
    <li data-status="ok">
      <button aria-expanded="true" aria-controls="tc-1-panel" id="tc-1-btn">
        <span aria-hidden="true"><ChevronIcon/></span>
        <span aria-hidden="true"><StatusIcon/></span>
        search_statutes
        <span class="sr-only">, Succeeded, 820 milliseconds</span>
        <span aria-hidden="true">820ms</span>
      </button>
      <div id="tc-1-panel" role="group" aria-labelledby="tc-1-btn">
        ...args, result, and a nested <ol> of children...
      </div>
    </li>
  </ol>
</div>
```

- Keyboard: `Tab`/`Shift+Tab` move between rows (native, no roving tabindex, no focus stealing). `Enter`/`Space` toggle. Additive, non-trapping shortcuts on a focused row: `ArrowRight` expands (or moves to first child if already expanded), `ArrowLeft` collapses (or moves to the parent row if already collapsed), `Home`/`End` jump to first/last visible row. Arrow keys never prevent default when the row is not focused, so text selection inside panels is unaffected.
- Status is never colour-only: every row's accessible name contains `labels.statuses[status]`, and each status has a distinct icon shape (dot, spinner, check, cross, slash).
- `"running"` rows carry `aria-busy="true"`. The spinner respects `prefers-reduced-motion` (§4.2) by falling back to a static filled dot.
- `announceStatusChanges` defaults to **false**. An agent firing twelve tools produces twelve announcements and drowns the actual answer. Consumers with a dedicated agent-progress view opt in.
- `args`/`result` render inside `<pre>` with `overflow-x-auto` and `tabIndex={0}`, because a scrollable region must be reachable by keyboard (a real and commonly missed WCAG failure).
- Deeper than `maxDepth`: a single row reading "3 more nested calls", which is a button that raises `maxDepth` locally rather than a dead end.
- `emptyState` renders in a `<p>`, not an empty `<ol>`.

#### Token usage

Row: `hover:bg-surface-raised`, selected `bg-accent/10 ring-1 ring-accent/30`. Status colours: `ok → text-success`, `error → text-danger`, `running → text-info`, `pending → text-fg-subtle`, `cancelled → text-fg-subtle`. Rails: `border-l border-border` per nesting level. Code: `bg-surface-sunken text-fg-muted font-mono text-xs`. Durations: `tabular-nums text-fg-subtle`.

#### Usage

```tsx
// 1. JurisGPT agent trace with a nested retrieval sub-call
import { ToolCallTimeline } from "atlas-ui/tool-call-timeline";

<ToolCallTimeline
  calls={[
    {
      id: "t1", name: "classify_query", status: "ok", durationMs: 120,
      args: { query: "common object under s.149" },
      result: { intent: "statute_lookup", jurisdiction: "IN" },
    },
    {
      id: "t2", name: "hybrid_retrieve", status: "running", startedAt: Date.now() - 1400,
      args: { top_k: 8, weights: { bm25: 0.6, dense: 0.4 } },
      children: [
        { id: "t2a", name: "bm25_search",  status: "ok", durationMs: 61 },
        { id: "t2b", name: "dense_search", status: "running", startedAt: Date.now() - 900 },
      ],
    },
  ]}
  defaultExpandedIds={["t2"]}
/>
```

```tsx
// 2. Controlled, driven by a detail panel
const [expanded, setExpanded] = useState<string[]>([]);
const [selected, setSelected] = useState<ToolCall>();

<div className="grid grid-cols-[320px_1fr] gap-4">
  <ToolCallTimeline
    calls={calls}
    density="compact"
    expandedIds={expanded}
    onExpandedChange={setExpanded}
    selectedId={selected?.id}
    onSelect={setSelected}
  />
  <ToolCallDetail call={selected} />
</div>
```

```tsx
// 3. HRMS — extra redaction and a domain result renderer
<ToolCallTimeline
  calls={calls}
  redactKeys={["ssn", "salary", "dateOfBirth", "employeeEmail"]}
  renderResult={(call) =>
    call.name === "lookup_employee"
      ? <EmployeeCard data={call.result as EmployeeRecord} />
      : undefined /* undefined falls back to the default renderer */
  }
/>
```

---

### 5.5 `TokenMeter`

#### Props

```ts
// src/components/token-meter/token-meter.types.ts
import type * as React from "react";

export interface TokenUsage {
  prompt: number;
  completion: number;
  /** Defaults to prompt + completion (+ reasoning when present). */
  total?: number;
  /** Cached prompt tokens, billed at the discounted rate. */
  cached?: number;
  /** Thinking / reasoning tokens, billed at the completion rate unless priced. */
  reasoning?: number;
}

export interface TokenPricing {
  /** ISO 4217. @default "USD" */
  currency?: string;
  promptPerMTok: number;
  completionPerMTok: number;
  /** @default promptPerMTok */
  cachedPromptPerMTok?: number;
  /** @default completionPerMTok */
  reasoningPerMTok?: number;
}

export interface TokenMeterThresholds {
  /** Fraction of budget at which the meter turns warning. @default 0.75 */
  warn: number;
  /** Fraction at which it turns danger. @default 0.9 */
  danger: number;
}

export interface TokenMeterLabels {
  prompt: string; completion: string; cached: string;
  reasoning: string; total: string; budget: string;
  ofBudget: string;        // "of budget used"
  overBudget: string;      // "over budget"
  estimatedCost: string;   // "Estimated cost"
  showDetails: string; hideDetails: string;
}

export interface TokenMeterProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  usage: TokenUsage;
  /** Context window or per-request cap. Omit to render counts with no meter. */
  budget?: number;
  budgetLabel?: string;

  /** Used to compute cost when `cost` is not given. */
  pricing?: TokenPricing;
  /** Precomputed cost; wins over `pricing`. */
  cost?: number;

  /** @default "compact" */
  variant?: "compact" | "expanded";
  defaultVariant?: "compact" | "expanded";
  onVariantChange?: (v: "compact" | "expanded") => void;
  /** Render the built-in expand/collapse control. @default false */
  collapsible?: boolean;

  thresholds?: Partial<TokenMeterThresholds>;
  /** Number/currency formatting locale. @default undefined (runtime default) */
  locale?: string;
  formatCost?: (cost: number, currency: string) => string;

  /** Fired once per crossing into over-budget. */
  onOverBudget?: (info: { total: number; budget: number }) => void;

  labels?: Partial<TokenMeterLabels>;
}

export declare const TokenMeter: React.ForwardRefExoticComponent<
  TokenMeterProps & React.RefAttributes<HTMLDivElement>
>;
```

```ts
// src/components/token-meter/pricing.ts
export function estimateCost(usage: TokenUsage, pricing: TokenPricing): number;

// src/lib/format.ts
export function formatTokens(n: number, locale?: string): string;   // 34500 -> "34.5K"
export function formatDuration(ms: number): string;                  // 82000 -> "1m 22s"
export function formatCost(v: number, currency?: string, locale?: string): string;
```

`estimateCost` bills `cached` at `cachedPromptPerMTok` and subtracts it from `prompt` so cached tokens are not double-counted. `reasoning` bills at `reasoningPerMTok ?? completionPerMTok`.

#### Controlled vs uncontrolled

Values are fully controlled — `usage` is a prop, always. The only stateful surface is `variant`, hybrid, and only reachable when `collapsible` is true. Passing `variant` without `collapsible` gives a fixed presentation with no control, which is the common embedded case.

#### Accessibility

- The bar uses `role="meter"` with `aria-valuenow={total}`, `aria-valuemin={0}`, `aria-valuemax={budget}`, and `aria-valuetext="34,512 of 128,000 tokens, 27% of budget used"`. `meter` is semantically correct — this is a measurement within a known range, not the progress of a task. Because `meter` support is uneven in VoiceOver, an `sr-only` sentence carrying the same information is rendered alongside, so nothing depends on the role being announced. If future testing shows `meter` is a net negative, the fallback already covers it and the change is one line.
- With no `budget`, no meter role is emitted — just formatted counts. A meter with no maximum is meaningless.
- **The counter is not a live region.** It updates per token. `aria-live="off"` on the numbers; a separate polite region fires only on threshold crossings ("75% of context budget used", "Over budget"). One announcement per crossing, deduplicated by a ref so re-renders do not repeat it.
- Over-budget is never colour-only: the accessible name and the visible text both gain `labels.overBudget`, plus a warning icon. `data-over-budget="true"` on the root for consumer styling.
- Numbers use `tabular-nums` so a streaming counter does not shift layout on every token — a legibility issue, and a distraction for users sensitive to motion.
- The expand control is a `<button aria-expanded aria-controls>` over a Radix `Collapsible`.
- Cost is labelled "Estimated cost" in the accessible name, never bare currency. A number that looks authoritative and is not is a product problem before it is an a11y problem.

#### Token usage

Track `bg-surface-sunken`; fill `bg-accent`, `data-state="warn" → bg-warning`, `data-state="danger" → bg-danger`. Fill width set via `--atlas-meter-fill` (§4.4). Labels `text-fg-muted`; totals `text-fg tabular-nums`; over-budget text `text-danger`.

#### Usage

```tsx
// 1. Compact, in a chat footer
import { TokenMeter } from "atlas-ui/token-meter";

<TokenMeter
  usage={{ prompt: 28_400, completion: 6_112, cached: 24_000 }}
  budget={128_000}
  pricing={{ promptPerMTok: 3, completionPerMTok: 15, cachedPromptPerMTok: 0.3 }}
  className="text-xs"
/>
```

```tsx
// 2. Expanded and collapsible, in a settings drawer
<TokenMeter
  usage={usage}
  budget={200_000}
  budgetLabel="Context window"
  collapsible
  defaultVariant="expanded"
  pricing={{ promptPerMTok: 3, completionPerMTok: 15, reasoningPerMTok: 15 }}
  thresholds={{ warn: 0.7, danger: 0.85 }}
  onOverBudget={({ total, budget }) => toast.warn(`Context full: ${total}/${budget}`)}
/>
```

```tsx
// 3. Counts only, no budget, precomputed cost from the billing API
<TokenMeter
  usage={{ prompt: 1_204, completion: 388, total: 1_592 }}
  cost={0.0092}
  variant="expanded"
  locale="en-IN"
/>
```

---

### 5.6 `RetrievalTrace`

Ranked retrieved chunks with per-retriever provenance. Designed against the real output of the author's `ragfuse` (`/Users/bruuu/ragfuse/src/ragfuse/_types.py`), which is the source of truth for these field names.

#### Props

```ts
// src/components/retrieval-trace/retrieval-trace.types.ts
import type * as React from "react";
import type { Density } from "../../types";

/** Mirrors ragfuse `Contribution`. */
export interface RetrieverContribution {
  /** Retriever name, e.g. "bm25" | "dense". */
  source: string;
  /** Zero-indexed position in that retriever's list. */
  rank: number;
  /** Weight applied during fusion. */
  weight: number;
  /** The weighted RRF term, weight / (k + rank + 1). */
  score: number;
}

/** Mirrors ragfuse `FusedHit`, plus display fields. */
export interface RetrievedChunk {
  /** Stable id the document was fused on (`FusedHit.key`). */
  key: string;
  /** Raw weighted RRF sum. */
  score: number;
  /** 0..1, relative to the top hit. */
  normalizedScore?: number;
  contributions?: readonly RetrieverContribution[];

  title?: string;
  /** Chunk body. Rendered as text; never parsed as HTML. */
  text?: string;
  url?: string;
  locator?: string;
  meta?: Record<string, unknown>;
}

export interface RetrieverDescriptor {
  name: string;
  label?: string;
  /** Fusion weight, shown in the legend. */
  weight?: number;
  /** Any CSS colour or `var(...)`. Falls back to the built-in palette. */
  color?: string;
}

export interface RetrievalTraceLabels {
  rank: string;            // "Rank"
  score: string;           // "Fused score"
  retrievedBy: string;     // "Retrieved by"
  weight: string;          // "weight"
  empty: string;           // "No chunks retrieved"
  expand: string; collapse: string;
  openSource: string;      // "Open source"
}

export interface RetrievalTraceProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  chunks: readonly RetrievedChunk[];
  /** Legend + colour assignment + weights. Inferred from contributions if omitted. */
  retrievers?: readonly RetrieverDescriptor[];
  /** Shown as a header and used for term highlighting. */
  query?: string;

  expandedKeys?: readonly string[];
  defaultExpandedKeys?: readonly string[];
  onExpandedChange?: (keys: string[]) => void;

  selectedKey?: string;
  onSelect?: (chunk: RetrievedChunk) => void;

  /** Wrap query terms in <mark>. Escaped, never innerHTML. @default false */
  highlightQueryTerms?: boolean;
  /** @default true */
  showProvenance?: boolean;
  /** @default "normalized" */
  scoreDisplay?: "normalized" | "raw" | "both";
  /** Collapsed snippet length. @default 320 */
  maxSnippetChars?: number;
  /** @default "comfortable" */
  density?: Density;

  renderChunk?: (
    chunk: RetrievedChunk,
    ctx: { rank: number; expanded: boolean; selected: boolean }
  ) => React.ReactNode;

  emptyState?: React.ReactNode;
  labels?: Partial<RetrievalTraceLabels>;
}

export declare const RetrievalTrace: React.ForwardRefExoticComponent<
  RetrievalTraceProps & React.RefAttributes<HTMLDivElement>
>;
```

#### The `ragfuse` adapter

The reason this component exists in this library and not another. `ragfuse` returns frozen dataclasses that serialise to snake_case JSON; the adapter accepts either casing and maps `hit.item` onto display fields.

```ts
// src/lib/adapters/ragfuse.ts
import type { RetrievedChunk } from "../../components/retrieval-trace/retrieval-trace.types";

/** JSON shape of a serialised ragfuse `Contribution`. */
export interface RagfuseContributionJSON {
  source: string;
  rank: number;
  weight: number;
  score: number;
}

/** JSON shape of a serialised ragfuse `FusedHit`. Accepts snake_case or camelCase. */
export interface RagfuseHitJSON {
  key: string;
  score: number;
  normalized_score?: number;
  normalizedScore?: number;
  contributions?: readonly RagfuseContributionJSON[];
  item?: unknown;
}

export interface FromRagfuseOptions<TItem = unknown> {
  getTitle?: (item: TItem, key: string) => string | undefined;
  getText?: (item: TItem, key: string) => string | undefined;
  getUrl?: (item: TItem, key: string) => string | undefined;
  getLocator?: (item: TItem, key: string) => string | undefined;
  getMeta?: (item: TItem, key: string) => Record<string, unknown> | undefined;
}

/**
 * Converts ragfuse output into `RetrievedChunk[]`. Pure; returns a new array
 * and never mutates the input. Throws on a missing `key`, matching ragfuse's
 * explicit-failure convention.
 */
export function fromRagfuse<TItem = unknown>(
  hits: readonly RagfuseHitJSON[],
  options?: FromRagfuseOptions<TItem>
): RetrievedChunk[];
```

#### Controlled vs uncontrolled

Expansion is hybrid. `selectedKey` / `onSelect` is controlled-only, for the same reason as `ToolCallTimeline`: selection drives the consumer's document viewer.

#### Accessibility

- The container is an `<ol>`: rank order is the entire point, and an unordered list would discard it for screen-reader users. Rank is also rendered as visible text, because list numbering is not reliably announced in every mode.
- Each `<li>` holds a `<button aria-expanded aria-controls>` over a Radix `Collapsible`, mirroring the timeline so the two components teach the same keyboard model.
- Provenance is text first: `"bm25 · rank 1 · w 0.6"`. Colour is a redundant reinforcement, applied via the `--atlas-retriever` custom property (§4.4). A four-retriever trace read aloud is fully intelligible with colour removed.
- Scores render as text with `tabular-nums`; bars are `aria-hidden="true"`.
- `scoreDisplay="both"` renders `"0.98 (raw 0.0163)"` — the raw weighted RRF sum is unreadable alone, and the normalised score alone hides ties. Defaulting to `"normalized"` keeps the common case legible.
- Query-term highlighting splits the string in JS and renders `<mark>` elements. Retrieved corpus text is untrusted; `dangerouslySetInnerHTML` is never used and is banned by lint in this package.
- The retriever legend is a `<ul>` before the list, associated by `aria-describedby` from the `<ol>`, so a screen-reader user meets the retriever names and weights before the per-chunk badges.
- Long chunk text lives in a scrollable region with `tabIndex={0}`.

#### Token usage

Row `border border-border rounded-lg bg-surface`; selected `ring-2 ring-accent/40`. Rank pill `bg-surface-sunken text-fg-subtle tabular-nums`. Provenance badge `border-[hsl(var(--atlas-retriever))]/40 text-[hsl(var(--atlas-retriever))] bg-[hsl(var(--atlas-retriever))]/10`. Score bar `bg-accent` on `bg-surface-sunken`. `<mark>` restyled to `bg-warning/25 text-fg rounded-sm px-0.5` so it inherits the theme instead of the browser's yellow.

#### Usage

```tsx
// 1. Straight from ragfuse JSON
import { RetrievalTrace } from "atlas-ui/retrieval-trace";
import { fromRagfuse } from "atlas-ui/utils";

const chunks = fromRagfuse<Statute>(response.hits, {
  getTitle: (s) => `${s.act} ${s.section}`,
  getText:  (s) => s.text,
  getUrl:   (s) => `/corpus/${s.id}`,
  getLocator: (s) => s.section,
});

<RetrievalTrace
  chunks={chunks}
  query={question}
  highlightQueryTerms
  retrievers={[
    { name: "bm25",  label: "BM25",        weight: 0.6 },
    { name: "dense", label: "InLegalBERT", weight: 0.4 },
  ]}
/>
```

```tsx
// 2. Compact debug drawer, controlled selection into a viewer
<div className="grid grid-cols-[minmax(0,1fr)_380px]">
  <FilingViewer chunkKey={selected} />
  <RetrievalTrace
    chunks={chunks}
    density="compact"
    scoreDisplay="both"
    selectedKey={selected}
    onSelect={(c) => setSelected(c.key)}
    className="border-l border-border"
  />
</div>
```

```tsx
// 3. Custom row for FinSight, provenance still handled by the library
<RetrievalTrace
  chunks={chunks}
  maxSnippetChars={200}
  renderChunk={(chunk, { rank }) => (
    <FilingChunkCard
      rank={rank}
      ticker={chunk.meta?.ticker as string}
      fiscalYear={chunk.meta?.fy as number}
      text={chunk.text}
    />
  )}
  emptyState={<p>No filings matched. Try naming a company or a fiscal year.</p>}
/>
```

---

### 5.7 `AssistantComposer`

#### Props

```ts
// src/components/assistant-composer/assistant-composer.types.ts
import type * as React from "react";

export type ComposerStatus = "idle" | "submitting" | "streaming";

export interface ComposerAttachment {
  id: string;
  name: string;
  /** Bytes. */
  size?: number;
  mimeType?: string;
  /** @default "ready" */
  status?: "pending" | "uploading" | "ready" | "error";
  /** 0..1, shown when status is "uploading". */
  progress?: number;
  error?: string;
  /** Thumbnail URL. The consumer owns creation and revocation. */
  previewUrl?: string;
}

export interface SlashCommand {
  id: string;
  /** Typed after the trigger, without it. e.g. "cite" for "/cite". */
  name: string;
  description?: string;
  /** Optional group heading in the menu. */
  group?: string;
  icon?: React.ReactNode;
  /** Extra terms matched by the default filter. */
  keywords?: readonly string[];
  disabled?: boolean;
}

export interface SlashCommandContext {
  /** Current full textarea value. */
  value: string;
  /** Text typed after the trigger. */
  query: string;
  /** Index of the trigger character in `value`. */
  triggerStart: number;
  /** Caret index. */
  caret: number;
  /** Pure: returns a NEW value with the trigger token replaced by `text`. */
  replace: (text: string) => string;
}

export interface ComposerSubmitPayload {
  text: string;
  attachments: readonly ComposerAttachment[];
}

export interface ComposerLabels {
  placeholder: string;
  send: string;                 // "Send message"
  stop: string;                 // "Stop generating"
  attach: string;               // "Attach files"
  removeAttachment: string;     // "Remove {name}"
  commands: string;             // "Commands"
  noCommands: string;           // "No matching commands"
  charactersRemaining: string;  // "{n} characters remaining"
  dropHere: string;             // "Drop files to attach"
}

export interface AssistantComposerProps {
  /** Controlled text. */
  value?: string;
  /** Uncontrolled initial text. @default "" */
  defaultValue?: string;
  onValueChange?: (value: string) => void;

  onSubmit: (payload: ComposerSubmitPayload) => void | Promise<void>;
  /** @default "idle" */
  status?: ComposerStatus;
  /** Renders a stop button in place of send while streaming. */
  onStop?: () => void;

  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  /** @default 1 */
  minRows?: number;
  /** @default 12 */
  maxRows?: number;
  /** "enter" -> Enter sends, Shift+Enter newline. @default "enter" */
  submitOn?: "enter" | "mod-enter";
  /** Clear the text after a resolved submit. @default true */
  clearOnSubmit?: boolean;

  /** Controlled-only. Omit entirely to disable attachments. */
  attachments?: readonly ComposerAttachment[];
  onAttachmentsAdd?: (files: readonly File[]) => void;
  onAttachmentRemove?: (id: string) => void;
  /** `<input accept>` value, e.g. "application/pdf,image/*". */
  accept?: string;
  maxFiles?: number;
  /** Bytes. Oversize files are rejected before `onAttachmentsAdd`. */
  maxFileSize?: number;
  /** @default true */
  allowPaste?: boolean;
  /** @default true */
  allowDrop?: boolean;
  /** Backspace on an empty input removes the last attachment. @default true */
  backspaceRemovesLastAttachment?: boolean;
  onFileRejected?: (file: File, reason: "size" | "type" | "count") => void;

  /** Omit to disable the slash menu. */
  commands?: readonly SlashCommand[];
  onCommandSelect?: (command: SlashCommand, ctx: SlashCommandContext) => void;
  /** @default "/" */
  commandTrigger?: string;
  commandFilter?: (commands: readonly SlashCommand[], query: string) => SlashCommand[];
  renderCommandItem?: (
    command: SlashCommand,
    state: { active: boolean; index: number }
  ) => React.ReactNode;

  /** Left of the send button. */
  toolbar?: React.ReactNode;
  /** Below the input, e.g. a TokenMeter. */
  footer?: React.ReactNode;

  labels?: Partial<ComposerLabels>;
  className?: string;
  textareaProps?: Omit<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "defaultValue" | "onChange" | "disabled" | "maxLength" | "placeholder"
  >;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}

export declare const AssistantComposer: React.ForwardRefExoticComponent<
  AssistantComposerProps & React.RefAttributes<HTMLFormElement>
>;
```

#### The slash-command hook

Exported separately so consumers can build their own composer against the same behaviour.

```ts
// src/hooks/use-slash-commands.ts
import type { SlashCommand, SlashCommandContext } from "../components/assistant-composer/assistant-composer.types";

export interface UseSlashCommandsOptions {
  commands: readonly SlashCommand[];
  /** @default "/" */
  trigger?: string;
  /** Only open when the trigger starts a line or follows whitespace. @default true */
  requireWordBoundary?: boolean;
  filter?: (commands: readonly SlashCommand[], query: string) => SlashCommand[];
  onSelect?: (command: SlashCommand, ctx: SlashCommandContext) => void;
  /** @default 8 */
  maxItems?: number;
}

export interface UseSlashCommandsResult {
  isOpen: boolean;
  query: string;
  items: SlashCommand[];
  activeIndex: number;
  /** DOM id of the active option, for aria-activedescendant. */
  activeId: string | undefined;

  getInputProps: (
    props?: React.TextareaHTMLAttributes<HTMLTextAreaElement>
  ) => React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    role: "combobox";
    "aria-expanded": boolean;
    "aria-controls": string | undefined;
    "aria-activedescendant": string | undefined;
    "aria-autocomplete": "list";
  };

  getListProps: () => { id: string; role: "listbox"; "aria-label": string };

  getItemProps: (
    command: SlashCommand,
    index: number
  ) => {
    id: string;
    role: "option";
    "aria-selected": boolean;
    "aria-disabled": boolean | undefined;
    onPointerEnter: () => void;
    onPointerDown: (e: React.PointerEvent) => void;  // preventDefault: keep focus
    onClick: () => void;
  };

  open: () => void;
  close: () => void;
  /** Selects `index`, or the active item when omitted. */
  select: (index?: number) => void;
}

export function useSlashCommands(options: UseSlashCommandsOptions): UseSlashCommandsResult;
```

The hook owns menu state only. It never owns the textarea value: `onSelect` receives a `SlashCommandContext` whose `replace(text)` is a **pure function returning a new string**, which the consumer applies. This keeps the hook usable in both controlled and uncontrolled composers and matches the immutable-update convention used across the author's codebases.

#### Controlled vs uncontrolled

- **Text: hybrid, and this is the one place uncontrolled genuinely matters.** In a long thread, a controlled composer re-renders the parent on every keystroke. `defaultValue` keeps typing local to the composer. `onValueChange` still fires for consumers who want to observe without owning.
- **Attachments: controlled-only** (ADR-004). The component never stores `File` objects. It validates (`accept`, `maxFiles`, `maxFileSize`), rejects with `onFileRejected`, and hands the survivors to `onAttachmentsAdd`. Upload, progress, cancellation, retry, and `URL.revokeObjectURL` are the app's, because a component that guesses at those leaks memory and cancels the wrong request.
- Omitting `attachments` disables attachments entirely, including the file button and drop target. Omitting `commands` disables the slash menu. Features appear only when their data is supplied — no boolean feature flags.

#### Accessibility

- The root is a `<form>` and send is `<button type="submit">`. This gives native implicit submission and makes mobile keyboards show the "go" action. Not a `<div>` with a click handler.
- The textarea is labelled: `aria-label` from `labels.placeholder`, or `textareaProps["aria-labelledby"]` when the consumer supplies a visible label. Placeholder is never the only label.
- Keyboard, menu closed:
  - `Enter` submits when `submitOn="enter"`; `Shift+Enter` inserts a newline.
  - `Cmd/Ctrl+Enter` always submits, in both modes.
  - `Escape` does nothing to the text. It never clears the draft, and it does not call `onStop` — destroying typed input on a stray Escape is a real product failure and there is no undo.
- Keyboard, menu open: `ArrowDown`/`ArrowUp` move the active option (wrapping), `Enter` and `Tab` select, `Escape` closes the menu only, `Home`/`End` jump to first/last. `Enter` does **not** submit while the menu is open.
- Combobox wiring: `role="combobox"` + `aria-expanded` + `aria-controls` + `aria-activedescendant` + `aria-autocomplete="list"` on the textarea, `role="listbox"` on the menu, `role="option"` + `aria-selected` on items. Focus stays in the textarea throughout; `onPointerDown` calls `preventDefault()` so clicking an option never blurs the input.
  *Caveat, documented:* `role="combobox"` on a `<textarea>` overrides its native role. This is the pattern used by production chat inputs (multi-line editors with mention/command menus) and is the pragmatic choice; it is on the manual screen-reader checklist (§8.3) for NVDA and VoiceOver each release.
- Attachments: a `<ul>` of chips, each with `<button aria-label="Remove report.pdf">`. Uploading chips carry `role="progressbar"` with `aria-valuenow`. Errors are text plus an icon, not a red border.
- **Drag-and-drop is never the only path.** A visually hidden `<input type="file">` is always rendered and always associated with a visible, focusable attach button. The drop zone adds `aria-hidden` visual affordance only.
- Paste-to-attach fires the same validation path as the file input.
- `backspaceRemovesLastAttachment` only triggers when the value is empty and the caret is at index 0, so it can never eat text.
- Character counter is `aria-live="off"` and referenced by `aria-describedby`; a separate polite region announces once when crossing 90% of `maxLength`.
- `status="streaming"` swaps send for stop. The two are separate buttons in a stable wrapper, so focus is not silently transplanted mid-interaction; the textarea stays editable so the user can compose the next turn while the model streams.
- Autosize uses `useLayoutEffect` (reset height to `auto`, read `scrollHeight`, clamp between `minRows` and `maxRows`) — about 15 lines, no dependency, no layout read during render so SSR is unaffected. CSS `field-sizing: content` is the eventual replacement; revisit when the browser floor allows.

#### Token usage

Shell `bg-surface border border-border rounded-lg focus-within:ring-2 focus-within:ring-ring`; drag-active `ring-2 ring-accent border-accent bg-accent/5`. Textarea `bg-transparent text-fg placeholder:text-fg-subtle resize-none`. Send `bg-accent text-accent-fg disabled:opacity-50`. Stop `border border-border text-fg-muted`. Menu `bg-surface-raised border border-border shadow-lg rounded-lg`; active option `bg-accent/12 text-fg`. Chips `bg-surface-sunken text-fg-muted border border-border`; error `text-danger border-danger/30`.

#### Usage

```tsx
// 1. Minimal, uncontrolled
import { AssistantComposer } from "atlas-ui/assistant-composer";

<AssistantComposer
  onSubmit={({ text }) => send(text)}
  status={isStreaming ? "streaming" : "idle"}
  onStop={stop}
  placeholder="Ask about a statute, a section, or a judgment…"
/>
```

```tsx
// 2. JurisGPT — slash commands, controlled text, TokenMeter in the footer
const [text, setText] = useState("");

<AssistantComposer
  value={text}
  onValueChange={setText}
  onSubmit={({ text }) => ask(text)}
  maxLength={4000}
  commands={[
    { id: "cite",    name: "cite",    description: "Cite a specific section",  group: "Retrieval" },
    { id: "compare", name: "compare", description: "Compare two provisions",   group: "Retrieval" },
    { id: "plain",   name: "plain",   description: "Explain in plain English", group: "Style" },
  ]}
  onCommandSelect={(cmd, ctx) => setText(ctx.replace(`/${cmd.name} `))}
  footer={<TokenMeter usage={usage} budget={128_000} className="text-xs" />}
/>
```

```tsx
// 3. FinSight — attachments owned by the app (ADR-004)
const [files, setFiles] = useState<ComposerAttachment[]>([]);

<AssistantComposer
  attachments={files}
  accept="application/pdf,text/csv"
  maxFiles={5}
  maxFileSize={20 * 1024 * 1024}
  onAttachmentsAdd={async (incoming) => {
    const pending = incoming.map(toPendingAttachment);
    setFiles((prev) => [...prev, ...pending]);            // immutable append
    for (const p of pending) {
      const done = await uploadFiling(p);
      setFiles((prev) => prev.map((f) => (f.id === done.id ? done : f)));
    }
  }}
  onAttachmentRemove={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
  onFileRejected={(file, reason) => toast.error(`${file.name}: ${reason}`)}
  onSubmit={({ text, attachments }) => ask(text, attachments)}
/>
```

---

## 6. Public API surface

```ts
// src/index.ts
export { StreamingMessage, completePartialMarkdown } from "./components/streaming-message";
export { CitationChip } from "./components/citation-chip";
export { ConfidenceBadge, confidenceFromScore, defaultConfidenceThresholds } from "./components/confidence-badge";
export { ToolCallTimeline } from "./components/tool-call-timeline";
export { TokenMeter, estimateCost } from "./components/token-meter";
export { RetrievalTrace } from "./components/retrieval-trace";
export { AssistantComposer } from "./components/assistant-composer";

export { useSlashCommands, useControllableState } from "./hooks";
export { cn, formatTokens, formatDuration, formatCost, safeStringify, fromRagfuse } from "./lib";

export type * from "./types";
export type * from "./components/streaming-message/streaming-message.types";
export type * from "./components/citation-chip/citation-chip.types";
export type * from "./components/confidence-badge/confidence-badge.types";
export type * from "./components/tool-call-timeline/tool-call-timeline.types";
export type * from "./components/token-meter/token-meter.types";
export type * from "./components/retrieval-trace/retrieval-trace.types";
export type * from "./components/assistant-composer/assistant-composer.types";
```

### Bundle budgets

Enforced by `size-limit` in CI. These are budgets to design against, not measurements.

| Entry | Budget (min+gzip, React external) |
|---|---|
| `atlas-ui/confidence-badge` | 4 kB |
| `atlas-ui/token-meter` | 5 kB |
| `atlas-ui/streaming-message` | 6 kB |
| `atlas-ui/citation-chip` | 16 kB (Popover dominates) |
| `atlas-ui/tool-call-timeline` | 9 kB |
| `atlas-ui/retrieval-trace` | 9 kB |
| `atlas-ui/assistant-composer` | 10 kB |
| `atlas-ui` (barrel, everything) | 46 kB |
| `atlas-ui/styles.css` | 12 kB |

If any budget is exceeded the build fails. This is the mechanism that keeps "small and opinionated" true past v0.1.0.

The barrel budget was raised from 42 kB to 46 kB when the seventh component landed: measured, the barrel went from 40.75 kB with six components to 44.46 kB with `AssistantComposer` (which is 5.05 kB against its own 10 kB budget). The per-component budgets are unchanged and remain the ones that matter, because the subpath imports are the recommended way to consume the library.

---

## 7. Storybook 8

Storybook is the development environment (no separate playground app), the visual documentation, and the host for the a11y and keyboard checks.

```ts
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",   // docs, controls, viewport, backgrounds
    "@storybook/addon-a11y",         // axe-core panel, per story
    "@storybook/addon-themes",       // light/dark toggle
  ],
  framework: { name: "@storybook/react-vite", options: {} },
  docs: { autodocs: "tag" },
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      // keep React's HTMLAttributes out of every props table
      propFilter: (prop) => !/node_modules\/@types\/react/.test(prop.parent?.fileName ?? ""),
    },
  },
};
export default config;
```

```tsx
// .storybook/preview.tsx
import type { Preview } from "@storybook/react";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import "./preview.css";   // @tailwind directives + ../src/styles/tokens.css

const preview: Preview = {
  parameters: {
    a11y: { test: "error" },   // a11y violations fail the story
    controls: { expanded: true },
    backgrounds: { disable: true },   // theming comes from data-theme, not backgrounds
  },
  decorators: [
    withThemeByDataAttribute({
      themes: { light: "light", dark: "dark" },
      defaultTheme: "light",
      attributeName: "data-theme",
    }),
  ],
};
export default preview;
```

Theming through `data-theme` on `<html>` is the same switch consumers use, so what Storybook renders is what ships. There is no Storybook-only dark mode path.

### Required stories per component

1. **Default** — the canonical use.
2. **All states** — every value of the main enum in one grid (all five `ToolCallStatus`, all four `ConfidenceLevel`, all five `StreamStatus`). This is the story the a11y addon and the contrast check run against.
3. **Dark** — same content with `data-theme="dark"` forced, so a regression in a token is visible without toggling.
4. **Keyboard** — a `play` function driving the component with `userEvent` only, asserting focus order and `aria-expanded` transitions. These double as integration tests and as the manual screen-reader script.
5. **Realistic** — a JurisGPT / FinSight / HRMS scenario with real-shaped data. This is what goes in the README and on the docs site.

A shared `src/stories/fixtures.ts` holds one realistic dataset per component, reused by both stories and unit tests so the two never drift.

---

## 8. Testing

### 8.1 Setup

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.stories.tsx", "src/**/index.ts", "src/types.ts"],
      thresholds: { lines: 80, functions: 80, branches: 75, statements: 80 },
    },
  },
});
```

`vitest.setup.ts` registers `@testing-library/jest-dom`, `vitest-axe/extend-expect`, and stubs `ResizeObserver`, `IntersectionObserver`, `matchMedia`, and `Element.prototype.scrollIntoView` — all absent from jsdom and all touched by Radix.

### 8.2 What is tested where

| Layer | Tool | Covers |
|---|---|---|
| Pure functions | vitest, no DOM | `completePartialMarkdown`, `safeStringify` (circular, depth, redaction), `estimateCost`, `formatTokens`/`formatDuration`, `fromRagfuse` (both casings, missing `key` throws), `confidenceFromScore` boundaries |
| Hooks | vitest + `renderHook` | `useControllableState` (both modes, warns on switch), `useSlashCommands` (open/close boundaries, filtering, wrap-around, `replace` purity) |
| Components | RTL + `user-event` | Keyboard paths from §5, `aria-*` wiring, controlled/uncontrolled parity, `labels` overrides, no-crash on empty/malformed data |
| A11y | `vitest-axe` | `expect(await axe(container)).toHaveNoViolations()` for every component in every main state, plus open-popover states |
| Package | `publint`, `attw --pack` | Exports map correctness, ESM/CJS type resolution under every `moduleResolution` |
| Types | `tsc --noEmit` on `examples/` | Every JSX snippet in this spec compiles against the built `.d.ts` |

**Honest limits of jsdom, and what covers them instead:**

- No layout, so Radix Popover **positioning** is untestable. Tests assert open/close, focus movement, Escape, and ARIA wiring — the behaviour that matters — not coordinates.
- axe cannot compute **colour contrast** without rendering. Contrast is verified by a Playwright + `@axe-core/playwright` pass over the built Storybook, run in CI on `main` and before release. That is one job, ~40 lines, and it is the only reason Playwright is in the repo.
- Screen-reader announcement **quality** cannot be automated. §12 is a manual pass with NVDA (Windows/Firefox) and VoiceOver (macOS/Safari) before each minor release, following the Keyboard stories as a script.

### 8.3 CI

`.github/workflows/ci.yml`, on push and PR: `typecheck` → `lint` → `test --coverage` → `build` → `check:pkg` → `size`. Every step blocking. A separate `a11y` job builds Storybook and runs the Playwright axe pass.

`.github/workflows/release.yml`, on `v*` tags: build, `check:pkg`, then `npm publish --provenance --access public` with `id-token: write`. Provenance is free and makes the supply chain auditable — worth the two lines for a package that consumers embed in their UI.

---

## 9. Security notes

Small library, but it renders untrusted text (model output and retrieved corpus chunks) and untrusted structured data (tool args). Four rules, all enforced:

1. **`dangerouslySetInnerHTML` is banned** by ESLint in this package. Query-term highlighting and snippet rendering split strings in JS and return `ReactNode[]`. If a consumer wants HTML, that is their `renderContent` and their liability, documented as such.
2. **`safeStringify` redacts by default** (§5.4). Credential-shaped keys never reach the DOM without an explicit opt-out.
3. **`source.url` and `chunk.url` are rendered as `<a href>`** with `rel="noopener noreferrer"`, and schemes are validated against an allowlist (`http:`, `https:`, `mailto:`, and same-origin relative paths). A model that emits `javascript:` in a citation URL is not hypothetical.
4. **No network calls, no telemetry, no `eval`, no dynamic `import()` of consumer strings.** The library's runtime footprint is rendering.

---

## 10. Build order — seven days

Ordered by risk, not by dependency. Days 2–4 are the simple presentational components: they exist to lock the conventions (token map, `cn`, `labels`, `data-*`, controlled hybrid, story shape, test shape) while the cost of changing a convention is still one afternoon. The two genuinely hard components come last, built on conventions that are already proven.

| Day | Deliverable | Done when |
|---|---|---|
| 1 | Repo skeleton: tsconfig, tsup config, exports map, `tokens.css`, `preset.ts`, `theme.css`, the CSS build script, `cn`/`format`/`safe-json`, `useControllableState`, Storybook boots, CI green on an empty build | `npm run build && npm run check:pkg` passes on a package exporting nothing |
| 2 | `ConfidenceBadge` + `TokenMeter`, with stories and tests | Conventions locked; the `sr-only` naming pattern and the static class-map pattern are settled |
| 3 | `CitationChip` (Popover + hover/focus wiring) and `RetrievalTrace` + `fromRagfuse` | Round-trip a real `ragfuse` JSON payload into a rendered trace |
| 4 | `ToolCallTimeline` + `safeStringify` redaction; Collapsible pattern extracted and reused | Nested trace expands, collapses, redacts, and passes axe |
| 5 | `StreamingMessage` + `completePartialMarkdown` — the highest-risk logic gets a whole day and the heaviest unit-test file | Fence/inline/link repair passes a table-driven suite of ~40 partial-string cases |
| 6 | `AssistantComposer` + `useSlashCommands` | Full keyboard matrix from §5.7 passes in a `play` function |
| 7 | A11y sweep (axe across all stories, manual NVDA + VoiceOver pass), README with both consumption modes, `publint`/`attw`, size budgets, `v0.1.0` release | Published, installable, and the README's copy-paste example works in a fresh Next.js app |

**Contingency.** If day 5 or 6 overruns, the release cut is `v0.1.0` without `AssistantComposer`, shipped as `v0.2.0` a week later. The exports map already isolates it, so dropping one entry is a one-line change and breaks nothing. Do not compress the day-7 a11y sweep — for this library specifically, accessibility is the product differentiator, and an inaccessible v0.1.0 is worse than a five-component v0.1.0.

---

## 11. Growth path

| Milestone | What changes |
|---|---|
| v0.2 | `AssistantComposer` if deferred; `CitationProvider` for automatic cross-document citation numbering; `atlas-ui/markdown` optional adapter entry |
| v0.3 | `ToolCallTimeline` opt-in `navigation="tree"` with full ARIA tree semantics; virtualisation for `RetrievalTrace` past ~200 chunks |
| v0.4 | Migrate tsup → tsdown; drop the Tailwind 3.4 preset if the ecosystem has moved, keeping `tokens.css` + `theme.css` |
| v1.0 | API freeze, a documentation site built from Storybook, and a published visual-regression baseline |

The architecture supports all of these without restructuring: subpath entries make additions non-breaking, the token layer means new components inherit theming for free, and the `labels` convention means i18n never requires a dependency.

---

## 12. Release checklist

- [ ] `tsc --noEmit` clean; every JSX example in this spec compiles against built `.d.ts`
- [ ] Coverage ≥ 80% lines/functions/statements, ≥ 75% branches
- [ ] `publint` and `attw --pack` clean
- [ ] All `size-limit` budgets met
- [ ] Every component reachable and fully operable with keyboard only — verified story by story
- [ ] axe clean in jsdom (all states) and in Playwright over built Storybook (contrast included)
- [ ] Manual NVDA/Firefox and VoiceOver/Safari pass on the Keyboard stories, including the textarea `role="combobox"` caveat (§5.7)
- [ ] Zero `dark:` classes in `src/`; zero template literals in `className`; zero `dangerouslySetInnerHTML`
- [ ] `dist/styles.css` contains no preflight
- [ ] Fresh `create-next-app` smoke test in both Mode A and Mode B
- [ ] CHANGELOG updated; tag pushed; `--provenance` attestation present on npm

---

### Referenced source

- `/Users/bruuu/ragfuse/src/ragfuse/_types.py` — canonical `Contribution` / `FusedHit` field names mirrored by `RetrieverContribution` / `RetrievedChunk` in §5.6
- `/Users/bruuu/ragfuse/README.md` — the fusion semantics (`weight / (k + rank + 1)`, zero-indexed ranks, `normalized_score` relative to the top hit) that `RetrievalTrace` visualises