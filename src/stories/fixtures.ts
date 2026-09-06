/**
 * One realistic dataset per component, imported by both the stories and the
 * unit tests so the two can never drift (SPEC section 7). The scenarios are
 * the ones the README uses: JurisGPT (Indian legal RAG), FinSight (10-K
 * analysis) and an HR policy assistant.
 *
 * One entry per component, all seven of them.
 */
import type {
  ComposerAttachment,
  SlashCommand,
} from "../components/assistant-composer/assistant-composer.types";
import type { CitationSource } from "../components/citation-chip/citation-chip.types";
import type { ConfidenceLevel } from "../components/confidence-badge/confidence-badge.types";
import type {
  RetrievedChunk,
  RetrieverDescriptor,
} from "../components/retrieval-trace/retrieval-trace.types";
import type { TokenPricing, TokenUsage } from "../components/token-meter/token-meter.types";
import type { ToolCall } from "../components/tool-call-timeline/tool-call-timeline.types";

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

/** JurisGPT: the query behind the fusion below, and the highlight terms. */
export const retrievalQuery = "common object unlawful assembly";

/** The two retrievers ragfuse fused, with the weights it fused them at. */
export const retrievers: readonly RetrieverDescriptor[] = [
  { name: "bm25", label: "BM25", weight: 0.6 },
  { name: "dense", label: "InLegalBERT", weight: 0.4 },
];

/** One ragfuse RRF result: two hits, one of them found by both retrievers. */
export const retrievedChunks: readonly RetrievedChunk[] = [
  {
    key: "ipc-149",
    score: 0.0163,
    normalizedScore: 1,
    title: "Indian Penal Code, 1860",
    locator: "§ 149",
    text: "Every member of an unlawful assembly is guilty of the offence committed in prosecution of the common object.",
    url: "/corpus/ipc/149",
    meta: { court: "Supreme Court", year: 1860, raw: { nested: true } },
    contributions: [
      { source: "bm25", rank: 0, weight: 0.6, score: 0.0098 },
      { source: "dense", rank: 2, weight: 0.4, score: 0.0065 },
    ],
  },
  {
    key: "crpc-107",
    score: 0.0081,
    normalizedScore: 0.5,
    title: "Code of Criminal Procedure, 1973",
    text: "Security for keeping the peace in other cases.",
    contributions: [{ source: "dense", rank: 0, weight: 0.4, score: 0.0081 }],
  },
];

/**
 * JurisGPT's agent loop for one answer: a classifier, a hybrid retrieval that
 * fanned out to two searches (one of which failed), and a draft still queued.
 * The `apiKey` is here on purpose — it is what the redaction default hides.
 */
export const toolCalls: readonly ToolCall[] = [
  {
    id: "t1",
    name: "classify_query",
    status: "ok",
    durationMs: 120,
    args: { query: "common object under s.149", apiKey: "sk-live-secret" },
    result: { intent: "statute_lookup", jurisdiction: "IN" },
  },
  {
    id: "t2",
    name: "hybrid_retrieve",
    status: "ok",
    durationMs: 1_400,
    args: { top_k: 8 },
    children: [
      { id: "t2a", name: "bm25_search", status: "ok", durationMs: 61, result: { hits: 3 } },
      {
        id: "t2b",
        name: "dense_search",
        status: "error",
        durationMs: 900,
        error: "embedding service timed out",
      },
    ],
  },
  { id: "t3", name: "draft_answer", status: "pending" },
];

/**
 * A finished JurisGPT answer, in the markdown a model actually emits: a bold
 * lead, an inline code span, a fenced block and a link. Every prefix of it is
 * a partial stream, which is what makes it useful to `partial-markdown`'s
 * tests as well as to the StreamingMessage stories.
 */
export const streamingAnswer = `**Held:** mere presence in a crowd is not enough — s. 149 needs a *shared* common object.

The retrieval side of this reads as:

\`\`\`python
hits = fuse(bm25(q), dense(q), weights=[0.6, 0.4])
\`\`\`

Corroboration is still required for a large crowd; see [Masalti](/corpus/scr/masalti-1964).`;

/** JurisGPT's composer commands, grouped the way the menu renders them. */
export const slashCommands: readonly SlashCommand[] = [
  { id: "cite", name: "cite", description: "Cite a specific section", group: "Retrieval" },
  { id: "compare", name: "compare", description: "Compare two provisions", group: "Retrieval" },
  { id: "plain", name: "plain", description: "Explain in plain English", group: "Style" },
];

/** One settled upload and one still in flight. */
export const composerAttachments: readonly ComposerAttachment[] = [
  { id: "a1", name: "filing.pdf", size: 24_000, status: "ready" },
  { id: "a2", name: "rows.csv", size: 1_200, status: "uploading", progress: 0.4 },
];
