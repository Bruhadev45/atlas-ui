const TOKEN_UNITS: readonly { threshold: number; divisor: number; suffix: string }[] = [
  { threshold: 1_000_000_000, divisor: 1_000_000_000, suffix: "B" },
  { threshold: 1_000_000, divisor: 1_000_000, suffix: "M" },
  { threshold: 1_000, divisor: 1_000, suffix: "K" },
];

/** Abbreviates a token count: 34500 -> "34.5K", 128000 -> "128K", 950 -> "950". */
export function formatTokens(n: number, locale?: string): string {
  const abs = Math.abs(n);
  for (const unit of TOKEN_UNITS) {
    if (abs >= unit.threshold) {
      const scaled = n / unit.divisor;
      const text = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(scaled);
      return `${text}${unit.suffix}`;
    }
  }
  return new Intl.NumberFormat(locale).format(n);
}

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

/** Formats a duration: 820 -> "820ms", 8200 -> "8.2s", 82000 -> "1m 22s". */
export function formatDuration(ms: number): string {
  if (ms < MS_PER_SECOND) return `${Math.round(ms)}ms`;
  if (ms < MS_PER_MINUTE) {
    const seconds = ms / MS_PER_SECOND;
    const rounded = Math.round(seconds * 10) / 10;
    return `${rounded}s`;
  }
  if (ms < MS_PER_HOUR) {
    const minutes = Math.floor(ms / MS_PER_MINUTE);
    const seconds = Math.round((ms % MS_PER_MINUTE) / MS_PER_SECOND);
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(ms / MS_PER_HOUR);
  const minutes = Math.round((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Formats a cost as currency. Costs under one unit keep up to four fraction
 * digits so per-request LLM costs ($0.0092) do not round to $0.01.
 */
export function formatCost(v: number, currency = "USD", locale?: string): string {
  const maximumFractionDigits = Math.abs(v) >= 1 ? 2 : 4;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(v);
}
