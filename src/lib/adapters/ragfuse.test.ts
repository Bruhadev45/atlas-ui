import { describe, expect, it, vi } from "vitest";
import { fromRagfuse } from "./ragfuse";
import type { RagfuseHitJSON } from "./ragfuse";

interface Statute {
  act: string;
  section: string;
  text: string;
  id: string;
}

/* The exact JSON `ragfuse.reciprocal_rank_fusion` serialises to. */
const hit: RagfuseHitJSON = {
  key: "ipc-149",
  score: 0.016_3,
  normalized_score: 1,
  contributions: [
    { source: "bm25", rank: 0, weight: 0.6, score: 0.0098 },
    { source: "dense", rank: 2, weight: 0.4, score: 0.0065 },
  ],
  item: {
    act: "Indian Penal Code, 1860",
    section: "§ 149",
    text: "Every member of an unlawful assembly is guilty of the offence.",
    id: "ipc-149",
  } satisfies Statute,
};

describe("fromRagfuse", () => {
  it("maps the snake_case wire format", () => {
    const [chunk] = fromRagfuse([hit]);
    expect(chunk).toMatchObject({ key: "ipc-149", score: 0.0163, normalizedScore: 1 });
    expect(chunk?.contributions).toEqual([
      { source: "bm25", rank: 0, weight: 0.6, score: 0.0098 },
      { source: "dense", rank: 2, weight: 0.4, score: 0.0065 },
    ]);
  });

  it("maps camelCase from a caller that already normalised the response", () => {
    const [chunk] = fromRagfuse([{ key: "a", score: 0.5, normalizedScore: 0.25 }]);
    expect(chunk?.normalizedScore).toBe(0.25);
  });

  it("prefers snake_case when a hit carries both", () => {
    const [chunk] = fromRagfuse([
      { key: "a", score: 0.5, normalized_score: 0.9, normalizedScore: 0.1 },
    ]);
    expect(chunk?.normalizedScore).toBe(0.9);
  });

  it("leaves normalizedScore undefined when the hit omits it", () => {
    const [chunk] = fromRagfuse([{ key: "a", score: 0.5 }]);
    expect(chunk?.normalizedScore).toBeUndefined();
  });

  it("passes item and key to every display getter", () => {
    const getMeta = vi.fn(() => ({ court: "SC" }));
    const [chunk] = fromRagfuse<Statute>([hit], {
      getTitle: (s) => `${s.act} ${s.section}`,
      getText: (s) => s.text,
      getUrl: (_s, key) => `/corpus/${key}`,
      getLocator: (s) => s.section,
      getMeta,
    });
    expect(chunk).toMatchObject({
      title: "Indian Penal Code, 1860 § 149",
      text: "Every member of an unlawful assembly is guilty of the offence.",
      url: "/corpus/ipc-149",
      locator: "§ 149",
      meta: { court: "SC" },
    });
    expect(getMeta).toHaveBeenCalledWith(hit.item, "ipc-149");
  });

  it("leaves display fields undefined when no getters are supplied", () => {
    const [chunk] = fromRagfuse([hit]);
    expect(chunk?.title).toBeUndefined();
    expect(chunk?.text).toBeUndefined();
    expect(chunk?.meta).toBeUndefined();
  });

  it("copies contributions instead of aliasing the response", () => {
    const [chunk] = fromRagfuse([hit]);
    expect(chunk?.contributions).not.toBe(hit.contributions);
    expect(chunk?.contributions?.[0]).not.toBe(hit.contributions?.[0]);
  });

  it("never mutates the input, even deeply frozen", () => {
    const frozen = Object.freeze([
      Object.freeze({
        ...hit,
        contributions: Object.freeze(hit.contributions!.map((c) => Object.freeze({ ...c }))),
      }),
    ]);
    const snapshot = JSON.stringify(frozen);
    fromRagfuse(frozen, { getTitle: () => "t" });
    expect(JSON.stringify(frozen)).toBe(snapshot);
  });

  it("returns a new empty array for no hits", () => {
    expect(fromRagfuse([])).toEqual([]);
  });

  it.each([
    ["missing", { score: 1 }],
    ["empty", { key: "", score: 1 }],
    ["not a string", { key: 7, score: 1 }],
  ])("throws when a hit's key is %s", (_case, bad) => {
    const hits = [hit, bad as RagfuseHitJSON];
    expect(() => fromRagfuse(hits)).toThrow(TypeError);
    /* The index is in the message: a 50-hit response is otherwise unsearchable. */
    expect(() => fromRagfuse(hits)).toThrow(/index 1/);
  });

  it("throws when handed something that is not an array", () => {
    expect(() => fromRagfuse(undefined as unknown as RagfuseHitJSON[])).toThrow(
      /expected an array/
    );
  });
});
