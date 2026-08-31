export interface SafeStringifyOptions {
  /** @default DEFAULT_REDACT_KEYS */
  redactKeys?: readonly string[];
  /** @default 2000 */
  maxChars?: number;
  /** @default 6 */
  maxDepth?: number;
}

/**
 * Redaction is on by default: tool-call arguments routinely carry API keys,
 * bearer tokens, and connection strings, and a debug timeline is exactly the
 * surface that ends up in a screenshot or a support ticket (SPEC section 5.4).
 */
export const DEFAULT_REDACT_KEYS: readonly string[] = [
  "apiKey",
  "api_key",
  "authorization",
  "password",
  "token",
  "secret",
  "cookie",
  "access_token",
  "refresh_token",
];

export interface SafeStringifyResult {
  text: string;
  truncated: boolean;
}

const REDACTED = "[redacted]";
const CIRCULAR = "[circular]";
const MAX_DEPTH = "[max depth]";

const DEFAULT_MAX_CHARS = 2000;
const DEFAULT_MAX_DEPTH = 6;

/** Circular-safe, depth-capped, length-capped, key-redacting stringify. */
export function safeStringify(value: unknown, options?: SafeStringifyOptions): SafeStringifyResult {
  const redactKeys = options?.redactKeys ?? DEFAULT_REDACT_KEYS;
  const maxChars = options?.maxChars ?? DEFAULT_MAX_CHARS;
  const maxDepth = options?.maxDepth ?? DEFAULT_MAX_DEPTH;
  const redactSet = new Set(redactKeys.map((key) => key.toLowerCase()));

  const raw = JSON.stringify(prepare(value, redactSet, maxDepth, 0, new Set()), null, 2) ?? "undefined";
  if (raw.length > maxChars) {
    return { text: `${raw.slice(0, maxChars)}…`, truncated: true };
  }
  return { text: raw, truncated: false };
}

/**
 * Builds a fresh, JSON-safe copy (inputs are never mutated) with circular
 * references, depth overflow, and redacted keys replaced by markers.
 */
function prepare(
  value: unknown,
  redactSet: ReadonlySet<string>,
  maxDepth: number,
  depth: number,
  ancestors: ReadonlySet<object>
): unknown {
  if (value === null || value === undefined) return value;

  switch (typeof value) {
    case "string":
    case "number":
    case "boolean":
      return value;
    case "bigint":
      return `${value.toString()}n`;
    case "function":
      return "[function]";
    case "symbol":
      return value.toString();
    default:
      break;
  }

  const obj = value as object;
  if (ancestors.has(obj)) return CIRCULAR;
  if (depth >= maxDepth) return MAX_DEPTH;
  if (obj instanceof Date) return obj.toISOString();

  const nextAncestors = new Set(ancestors);
  nextAncestors.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => prepare(item, redactSet, maxDepth, depth + 1, nextAncestors));
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(obj)) {
    out[key] = redactSet.has(key.toLowerCase())
      ? REDACTED
      : prepare(entry, redactSet, maxDepth, depth + 1, nextAncestors);
  }
  return out;
}
