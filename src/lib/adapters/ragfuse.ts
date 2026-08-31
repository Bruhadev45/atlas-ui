import type {
  RetrievedChunk,
  RetrieverContribution,
} from "../../components/retrieval-trace/retrieval-trace.types";

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

/* ragfuse's dataclasses are frozen; `.map` here keeps that property on the
   JavaScript side, so a chunk array can never write back into the response. */
function copyContribution(c: RagfuseContributionJSON): RetrieverContribution {
  return { source: c.source, rank: c.rank, weight: c.weight, score: c.score };
}

function toChunk<TItem>(
  hit: RagfuseHitJSON,
  index: number,
  options: FromRagfuseOptions<TItem>
): RetrievedChunk {
  const key = hit?.key;
  if (typeof key !== "string" || key.length === 0) {
    throw new TypeError(
      `fromRagfuse: hit at index ${index} has no \`key\`. ragfuse fuses on \`key\`, ` +
        "so a hit without one cannot be identified or expanded."
    );
  }

  /* Python serialises `normalized_score`; a TS caller that already mapped the
     response hands over `normalizedScore`. Accept both, snake_case first. */
  const normalizedScore = hit.normalized_score ?? hit.normalizedScore;
  const item = hit.item as TItem;

  return {
    key,
    score: hit.score,
    normalizedScore,
    contributions: hit.contributions?.map(copyContribution),
    title: options.getTitle?.(item, key),
    text: options.getText?.(item, key),
    url: options.getUrl?.(item, key),
    locator: options.getLocator?.(item, key),
    meta: options.getMeta?.(item, key),
  };
}

/**
 * Converts ragfuse output into `RetrievedChunk[]`. Pure; returns a new array
 * and never mutates the input. Throws on a missing `key`, matching ragfuse's
 * explicit-failure convention — a silently dropped hit would show up as a
 * retrieval bug much later, in someone else's code.
 */
export function fromRagfuse<TItem = unknown>(
  hits: readonly RagfuseHitJSON[],
  options: FromRagfuseOptions<TItem> = {}
): RetrievedChunk[] {
  if (!Array.isArray(hits)) {
    throw new TypeError(
      `fromRagfuse: expected an array of ragfuse hits, received ${typeof hits}.`
    );
  }
  return hits.map((hit, index) => toChunk(hit, index, options));
}
