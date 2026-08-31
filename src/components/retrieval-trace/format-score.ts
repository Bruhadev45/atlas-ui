/** Trims the trailing zeros a fixed-decimal string leaves behind: "0.60" -> "0.6". */
function trimZeros(text: string): string {
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}

/** Normalised score, always two decimals: 0.9843 -> "0.98". */
export function formatNormalized(score: number): string {
  return score.toFixed(2);
}

/**
 * Raw weighted RRF sums are small and cluster tightly (0.0163 vs 0.0161), so
 * they get four decimals, or three significant digits once four decimals would
 * round them to zero.
 */
export function formatRawScore(score: number): string {
  if (score === 0) return "0";
  return Math.abs(score) >= 0.0001 ? trimZeros(score.toFixed(4)) : score.toPrecision(3);
}

/** Fusion weight as written by a human: 0.6 -> "0.6", 1 -> "1". */
export function formatWeight(weight: number): string {
  return trimZeros(weight.toFixed(2));
}
