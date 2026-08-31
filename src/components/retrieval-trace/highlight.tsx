import type * as React from "react";

/* \p{M} keeps combining marks attached: without it "धारा" splits into two
   one-character tokens and is dropped before it can ever be highlighted. */
const NON_WORD = /[^\p{L}\p{N}\p{M}]+/u;
const REGEXP_SPECIALS = /[.*+?^${}()|[\]\\]/g;

/**
 * Splits a query into highlightable terms: lowercased, deduped, one-character
 * tokens dropped (a lone "a" would mark half the corpus).
 */
export function queryTerms(query: string): string[] {
  const seen = new Set<string>();
  for (const raw of query.split(NON_WORD)) {
    const term = raw.toLowerCase();
    if (term.length > 1) seen.add(term);
  }
  return [...seen];
}

function termsPattern(terms: readonly string[]): RegExp | null {
  if (terms.length === 0) return null;
  /* Longest first so "retrieval" wins over "retrieve" at the same position. */
  const alternatives = [...terms]
    .sort((a, b) => b.length - a.length)
    .map((term) => term.replace(REGEXP_SPECIALS, "\\$&"));
  return new RegExp(`(${alternatives.join("|")})`, "giu");
}

/**
 * Wraps every occurrence of `terms` in `<mark>`. The string is split in JS and
 * emitted as React text nodes — corpus text is untrusted, so no HTML is ever
 * parsed (SPEC section 9).
 */
export function highlightTerms(text: string, terms: readonly string[]): React.ReactNode {
  const pattern = termsPattern(terms);
  if (pattern === null) return text;

  const parts = text.split(pattern);
  if (parts.length === 1) return text;

  const lookup = new Set(terms);
  return parts.map((part, i) =>
    /* String.split with one capture group yields matches at odd indices. */
    i % 2 === 1 && lookup.has(part.toLowerCase()) ? (
      <mark key={i} className="rounded-sm bg-warning/25 px-0.5 text-fg">
        {part}
      </mark>
    ) : (
      part
    )
  );
}
