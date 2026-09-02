/*
 * A sentence terminator followed by whitespace, optionally through a closing
 * quote or bracket ("…said so." / (…done.) ). Whitespace is required, so
 * "v1.2" and "Dr. " boundaries inside a number never split a chunk early.
 */
const SENTENCE_END = /[.!?]["')\]]?\s/g;

/**
 * The end offset of the last complete sentence at or after `from`, or `from`
 * when the tail has not terminated yet. Used by the `"sentence"` announcement
 * strategy so a live region flushes whole sentences instead of tokens.
 */
export function lastSentenceEnd(text: string, from: number): number {
  const pattern = new RegExp(SENTENCE_END.source, "g");
  pattern.lastIndex = Math.max(0, from);
  let end = from;
  let match: RegExpExecArray | null = pattern.exec(text);
  while (match !== null) {
    end = match.index + match[0].length;
    match = pattern.exec(text);
  }
  return end;
}
