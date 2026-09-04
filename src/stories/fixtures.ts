/**
 * One realistic dataset per component, imported by both the stories and the
 * unit tests so the two can never drift (SPEC section 7). The scenarios are
 * the ones the README uses: JurisGPT (Indian legal RAG), FinSight (10-K
 * analysis) and an HR policy assistant.
 *
 * Datasets land here as each component gets its stories.
 */
import type { CitationSource } from "../components/citation-chip/citation-chip.types";
import type { ConfidenceLevel } from "../components/confidence-badge/confidence-badge.types";
import type { TokenPricing, TokenUsage } from "../components/token-meter/token-meter.types";

/** Every value of the enum, in the order the "All states" stories grid them. */
export const confidenceLevels: readonly ConfidenceLevel[] = [
  "high",
  "medium",
  "low",
  "insufficient",
];

/** JurisGPT: the passage a common-object answer is grounded in. */
export const citationSource: CitationSource = {
  id: "sec-149",
  title: "Indian Penal Code, 1860",
  locator: "§ 149",
  snippet:
    "Every member of unlawful assembly guilty of offence committed in prosecution of common object.",
  score: 0.92,
  scoreLabel: "fused",
  retriever: "bm25 + InLegalBERT",
  url: "/corpus/ipc/149",
  meta: { Filed: "1860-10-06" },
};

/** The same answer's full citation list, one chip per sentence. */
export const citationSources: readonly CitationSource[] = [
  citationSource,
  {
    id: "sec-141",
    title: "Indian Penal Code, 1860",
    locator: "§ 141",
    snippet:
      "An assembly of five or more persons is designated an unlawful assembly if the common object of its members is one of the five enumerated objects.",
    score: 0.81,
    scoreLabel: "fused",
    retriever: "bm25",
    url: "/corpus/ipc/141",
  },
  {
    id: "masalti-1964",
    title: "Masalti v. State of Uttar Pradesh",
    locator: "AIR 1965 SC 202",
    snippet:
      "Where a large crowd is involved, the court insists on the testimony of at least two witnesses before convicting an individual member.",
    score: 0.64,
    scoreLabel: "cosine",
    retriever: "InLegalBERT",
    url: "/corpus/scr/masalti-1964",
    meta: { Bench: "5 judges", Decided: "1964-08-13" },
  },
];

/** FinSight: one turn of a 10-K analysis against a 128k context window. */
export const tokenUsage: TokenUsage = { prompt: 28_400, completion: 6_112 };
export const tokenBudget = 128_000;

/** The same turn on a prompt-cached, extended-thinking run. */
export const tokenUsageDetailed: TokenUsage = {
  prompt: 28_400,
  completion: 6_112,
  cached: 24_000,
  reasoning: 1_840,
};

/** Published per-million-token rates for the model FinSight runs on. */
export const tokenPricing: TokenPricing = {
  currency: "USD",
  promptPerMTok: 3,
  completionPerMTok: 15,
  cachedPromptPerMTok: 0.3,
};
