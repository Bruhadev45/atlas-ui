import type { RetrievedChunk, RetrieverDescriptor } from "./retrieval-trace.types";

/**
 * The palette lives in the token layer (`tokens.css`), so a consumer restyles
 * retriever colours by redefining four CSS variables rather than passing
 * `color` on every descriptor. Each entry resolves to an HSL channel triplet,
 * which is what lets `hsl(var(--atlas-retriever) / <alpha>)` tint the badge's
 * border, text and background from one value (SPEC section 4.4). Colour is
 * never the only signal — every badge also spells its retriever out in text.
 */
export const RETRIEVER_PALETTE: readonly string[] = [
  "var(--atlas-retriever-1)",
  "var(--atlas-retriever-2)",
  "var(--atlas-retriever-3)",
  "var(--atlas-retriever-4)",
];

/** Used when a source has no descriptor and no palette slot to fall back on. */
export const FALLBACK_COLOR = "var(--atlas-retriever-1)";

export interface ResolvedRetriever {
  name: string;
  label: string;
  weight?: number;
  /** HSL channel triplet for `--atlas-retriever`. */
  color: string;
}

function paletteColor(index: number): string {
  /* noUncheckedIndexedAccess: the modulo keeps this in range, the ?? is for tsc. */
  return RETRIEVER_PALETTE[index % RETRIEVER_PALETTE.length] ?? FALLBACK_COLOR;
}

/**
 * Builds the retriever lookup used by the legend and the provenance badges.
 * Declared retrievers come first and keep their order; any extra source seen
 * in a contribution is appended, so an undeclared retriever still renders with
 * its own colour instead of silently borrowing another's.
 */
export function resolveRetrievers(
  chunks: readonly RetrievedChunk[],
  descriptors?: readonly RetrieverDescriptor[]
): Map<string, ResolvedRetriever> {
  const resolved = new Map<string, ResolvedRetriever>();

  for (const descriptor of descriptors ?? []) {
    if (resolved.has(descriptor.name)) continue;
    resolved.set(descriptor.name, {
      name: descriptor.name,
      label: descriptor.label ?? descriptor.name,
      weight: descriptor.weight,
      color: descriptor.color ?? paletteColor(resolved.size),
    });
  }

  for (const chunk of chunks) {
    for (const contribution of chunk.contributions ?? []) {
      if (resolved.has(contribution.source)) continue;
      resolved.set(contribution.source, {
        name: contribution.source,
        label: contribution.source,
        /* Fusion weight is per-retriever, so the first contribution that
           mentions it is as authoritative as any later one. */
        weight: contribution.weight,
        color: paletteColor(resolved.size),
      });
    }
  }

  return resolved;
}
