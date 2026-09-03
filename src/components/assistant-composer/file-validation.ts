import type { FileRejectionReason } from "./assistant-composer.types";

export interface FileValidationOptions {
  /** An `<input accept>` value. Undefined or empty accepts every type. */
  accept?: string;
  maxFiles?: number;
  /** Bytes. */
  maxFileSize?: number;
  /** How many attachments the consumer already holds. */
  currentCount?: number;
}

export interface FileRejection {
  file: File;
  reason: FileRejectionReason;
}

export interface FileValidationResult {
  accepted: File[];
  rejected: FileRejection[];
}

/** Pure: one `accept` token, matched the way the file input matches it. */
function matchesToken(file: File, token: string): boolean {
  const type = (file.type || "").toLowerCase();

  if (token.startsWith(".")) return file.name.toLowerCase().endsWith(token);
  if (token === "*/*") return true;
  if (token.endsWith("/*")) return type.startsWith(`${token.slice(0, -1)}`);
  return type === token;
}

/** Pure: does `file` satisfy an `<input accept>` list? */
export function matchesAccept(file: File, accept?: string): boolean {
  const tokens = (accept ?? "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return true;
  return tokens.some((token) => matchesToken(file, token));
}

/**
 * Pure: splits an incoming batch into the files worth handing to the consumer
 * and the ones to report through `onFileRejected`.
 *
 * Checked in the order the user perceives them — a file of the wrong type is
 * rejected as "type" even when it is also oversize, and the count limit is
 * applied last so it counts only files that would otherwise have been kept.
 */
export function validateFiles(
  files: readonly File[],
  options: FileValidationOptions = {}
): FileValidationResult {
  const { accept, maxFiles, maxFileSize, currentCount = 0 } = options;

  const accepted: File[] = [];
  const rejected: FileRejection[] = [];

  for (const file of files) {
    if (!matchesAccept(file, accept)) {
      rejected.push({ file, reason: "type" });
      continue;
    }
    if (maxFileSize !== undefined && file.size > maxFileSize) {
      rejected.push({ file, reason: "size" });
      continue;
    }
    if (maxFiles !== undefined && currentCount + accepted.length >= maxFiles) {
      rejected.push({ file, reason: "count" });
      continue;
    }
    accepted.push(file);
  }

  return { accepted, rejected };
}
