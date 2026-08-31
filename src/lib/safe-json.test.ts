import { describe, expect, it } from "vitest";
import { DEFAULT_REDACT_KEYS, safeStringify } from "./safe-json";

describe("DEFAULT_REDACT_KEYS", () => {
  it("covers the credential-shaped keys from the spec", () => {
    expect(DEFAULT_REDACT_KEYS).toEqual([
      "apiKey",
      "api_key",
      "authorization",
      "password",
      "token",
      "secret",
      "cookie",
      "access_token",
      "refresh_token",
    ]);
  });
});

describe("safeStringify", () => {
  it("stringifies plain data with stable pretty-printing", () => {
    const { text, truncated } = safeStringify({ a: 1, b: ["x", true, null] });
    expect(truncated).toBe(false);
    expect(JSON.parse(text)).toEqual({ a: 1, b: ["x", true, null] });
  });

  it("survives circular references instead of throwing", () => {
    const value: Record<string, unknown> = { name: "loop" };
    value.self = value;
    const { text } = safeStringify(value);
    expect(text).toContain("[circular]");
    expect(text).toContain("loop");
  });

  it("allows repeated (non-circular) references to the same object", () => {
    const shared = { id: 1 };
    const { text } = safeStringify({ a: shared, b: shared });
    expect(text).not.toContain("[circular]");
  });

  it("caps depth at maxDepth (default 6)", () => {
    type Nested = { child?: Nested; leaf?: string };
    let deep: Nested = { leaf: "bottom" };
    for (let i = 0; i < 9; i += 1) deep = { child: deep };
    const { text } = safeStringify(deep);
    expect(text).toContain("[max depth]");
    expect(text).not.toContain("bottom");
  });

  it("honours a custom maxDepth", () => {
    const { text } = safeStringify({ a: { b: { c: 1 } } }, { maxDepth: 2 });
    expect(text).toContain("[max depth]");
    expect(text).not.toContain('"c"');
  });

  it("caps output length at maxChars and flags truncation", () => {
    const { text, truncated } = safeStringify({ blob: "x".repeat(500) }, { maxChars: 50 });
    expect(truncated).toBe(true);
    expect(text.length).toBe(51);
    expect(text.endsWith("…")).toBe(true);
  });

  it("redacts default credential keys case-insensitively", () => {
    const { text } = safeStringify({
      apiKey: "sk-live-123",
      Authorization: "Bearer abc",
      API_KEY: "another",
      nested: { password: "hunter2" },
      safe: "visible",
    });
    expect(text).not.toContain("sk-live-123");
    expect(text).not.toContain("Bearer abc");
    expect(text).not.toContain("another");
    expect(text).not.toContain("hunter2");
    expect(text).toContain("visible");
    expect(text.match(/\[redacted\]/g)).toHaveLength(4);
  });

  it("lets consumers widen the redaction list", () => {
    const { text } = safeStringify(
      { ssn: "000-00-0000", apiKey: "sk-1" },
      { redactKeys: [...DEFAULT_REDACT_KEYS, "ssn"] }
    );
    expect(text).not.toContain("000-00-0000");
    expect(text).not.toContain("sk-1");
  });

  it("only disables redaction on the explicit empty-list opt-out", () => {
    const { text } = safeStringify({ apiKey: "sk-live-123" }, { redactKeys: [] });
    expect(text).toContain("sk-live-123");
  });

  it("handles non-JSON values without throwing", () => {
    const { text } = safeStringify({
      when: new Date("2026-01-02T03:04:05.000Z"),
      big: 42n,
      fn: () => "nope",
      sym: Symbol("s"),
      missing: undefined,
    });
    expect(text).toContain("2026-01-02T03:04:05.000Z");
    expect(text).toContain("42n");
    expect(text).toContain("[function]");
    const { text: topLevel } = safeStringify(undefined);
    expect(topLevel).toBe("undefined");
  });
});
