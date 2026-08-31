import type { ConfidenceLevel } from "./confidence-badge.types";

export interface ConfidenceThresholds {
  /** score >= high  -> "high"   @default 0.8 */
  high: number;
  /** score >= medium -> "medium" @default 0.6 */
  medium: number;
  /** score >= low -> "low"; below this, still "low" @default 0.0 */
  low: number;
}

export const defaultConfidenceThresholds: ConfidenceThresholds = {
  high: 0.8,
  medium: 0.6,
  low: 0.0,
};

/**
 * Maps a 0..1 score onto a level. Never returns "insufficient": "low" means
 * "we answered, and we are not confident"; "insufficient" means "retrieval
 * returned nothing worth answering from, so this is not an answer". Collapsing
 * them into one score band is how RAG products end up confidently wrong, so
 * the caller sets "insufficient" explicitly when the retriever comes back
 * empty or below its floor.
 */
export function confidenceFromScore(
  score: number,
  thresholds?: Partial<ConfidenceThresholds>
): Exclude<ConfidenceLevel, "insufficient"> {
  const merged = { ...defaultConfidenceThresholds, ...thresholds };
  if (Number.isNaN(score)) return "low";
  if (score >= merged.high) return "high";
  if (score >= merged.medium) return "medium";
  return "low";
}
