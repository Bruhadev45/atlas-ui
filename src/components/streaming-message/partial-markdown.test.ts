import { describe, expect, it } from "vitest";
import { completePartialMarkdown } from "./partial-markdown";
/* The realistic answer the StreamingMessage stories render (SPEC section 7). */
import { streamingAnswer } from "../../stories/fixtures";

/**
 * The parser's contract is a table, because every regression in it looks like
 * one more half-written token the model happened to emit. Cases are grouped by
 * what is unterminated; `input` is what a stream would hold at that instant.
 */
const cases: ReadonlyArray<readonly [name: string, input: string, expected: string]> = [
  // --- finished text is a fixed point ------------------------------------
  ["empty string", "", ""],
  ["plain prose", "The assembly shared a common object.", "The assembly shared a common object."],
  ["balanced strong and emphasis", "**bold** and *italic*", "**bold** and *italic*"],
  ["balanced underscore emphasis", "_quiet_ and __loud__", "_quiet_ and __loud__"],
  ["balanced code span", "call `retrieve()` first", "call `retrieve()` first"],
  ["closed fence", "```js\nconst a = 1;\n```", "```js\nconst a = 1;\n```"],
  ["complete link", "see [the act](https://x.dev)", "see [the act](https://x.dev)"],
  ["complete image", "![chart](https://x.dev/a.png)", "![chart](https://x.dev/a.png)"],
  ["heading and list", "# Title\n\n- one\n- two", "# Title\n\n- one\n- two"],
  ["snake_case is not emphasis", "call top_k_results now", "call top_k_results now"],
  ["multiplication is not emphasis", "5 * 3 = 15", "5 * 3 = 15"],
  ["bullet star is not emphasis", "* one\n* two", "* one\n* two"],
  ["escaped asterisk", "a literal \\* star", "a literal \\* star"],
  ["bracket with no link", "the [bracketed] word here", "the [bracketed] word here"],
  ["stray closing bracket", "an array] tail", "an array] tail"],

  // --- unterminated code fences -----------------------------------------
  ["bare open fence", "```", "```\n```"],
  ["fence with info string", "```python", "```python\n```"],
  ["fence with a partial body", "```py\nimport os", "```py\nimport os\n```"],
  ["fence body ending in a newline", "```py\nimport os\n", "```py\nimport os\n```"],
  ["tilde fence", "~~~\nplain", "~~~\nplain\n~~~"],
  ["prose then an open fence", "Here is the code:\n\n```ts\nconst x", "Here is the code:\n\n```ts\nconst x\n```"],
  ["indented fence still opens", "   ```\nbody", "   ```\nbody\n```"],
  ["second fence reopens after a closed one", "```\na\n```\n\n```\nb", "```\na\n```\n\n```\nb\n```"],
  ["longer fence is not closed by a shorter run", "````\ninner\n```", "````\ninner\n```\n````"],
  ["inline marks inside an open fence stay literal", "```\nvalue = **x", "```\nvalue = **x\n```"],

  // --- unterminated inline marks ----------------------------------------
  ["open strong", "**Held:** the appeal is **allowed on", "**Held:** the appeal is **allowed on**"],
  ["open emphasis", "the *ratio decidendi", "the *ratio decidendi*"],
  ["open underscore emphasis", "the _obiter", "the _obiter_"],
  ["open double underscore", "the __statute", "the __statute__"],
  ["open code span", "call `retrieve(", "call `retrieve(`"],
  ["open double-backtick span", "call ``a `b`` then ``c", "call ``a `b`` then ``c``"],
  ["nested emphasis inside strong", "**bold with *inner", "**bold with *inner***"],
  ["nested code inside emphasis", "*label `field", "*label `field`*"],
  ["half-written strong closer", "**allowed*", "**allowed**"],
  ["strong closer overshooting emphasis", "*allowed**", "*allowed*"],
  ["triple run opens strong plus emphasis", "***loud", "***loud***"],
  ["triple run closes both", "***loud***", "***loud***"],
  ["trailing opener wraps nothing and is dropped", "The holding is **", "The holding is "],
  ["trailing single asterisk is dropped", "The holding is *", "The holding is "],
  ["trailing backtick is dropped", "The value is `", "The value is "],
  ["trailing underscore is dropped", "The value is _", "The value is "],
  ["emphasis after a closed span", "`a` then *b", "`a` then *b*"],
  ["marks inside a closed code span stay literal", "use `a ** b` now", "use `a ** b` now"],

  // --- dangling links ---------------------------------------------------
  ["open label", "see [the act", "see "],
  ["closed label, no destination", "see [the act]", "see "],
  ["open destination", "see [the act](", "see "],
  ["partial destination", "see [the act](htt", "see "],
  ["partial image", "![chart](https://x.dev/a.p", ""],
  ["open image label", "![cha", ""],
  ["lone open bracket", "[", ""],
  ["earlier link survives", "see [one](https://a.dev) and [tw", "see [one](https://a.dev) and "],
  ["dangling link after strong", "**Held:** see [the ac", "**Held:** see "],
  ["link on an earlier line is left alone", "see [the act\nnext line", "see [the act\nnext line"],
];

describe("completePartialMarkdown", () => {
  it.each(cases)("%s", (_name, input, expected) => {
    expect(completePartialMarkdown(input)).toBe(expected);
  });

  it("is idempotent — repairing a repaired string changes nothing", () => {
    for (const [, input] of cases) {
      const once = completePartialMarkdown(input);
      expect(completePartialMarkdown(once)).toBe(once);
    }
  });

  /*
   * The table covers the shapes; this covers the sequence. Every prefix of a
   * real answer is an instant some consumer renders, and each one has to land
   * on a fixed point — otherwise the repaired output would itself need
   * repairing and the view would flicker between two renderings of one token.
   */
  it("repairs every prefix of a real answer to a fixed point", () => {
    expect(completePartialMarkdown(streamingAnswer)).toBe(streamingAnswer);
    for (let end = 0; end <= streamingAnswer.length; end += 1) {
      const once = completePartialMarkdown(streamingAnswer.slice(0, end));
      expect(completePartialMarkdown(once)).toBe(once);
    }
  });
});

describe("completePartialMarkdown options", () => {
  it("leaves an open fence alone with closeCodeFences off", () => {
    expect(completePartialMarkdown("```py\nimport os", { closeCodeFences: false })).toBe(
      "```py\nimport os"
    );
  });

  it("leaves open marks alone with closeInlineMarks off", () => {
    expect(completePartialMarkdown("the *ratio", { closeInlineMarks: false })).toBe("the *ratio");
    expect(completePartialMarkdown("the value is **", { closeInlineMarks: false })).toBe(
      "the value is **"
    );
  });

  it("keeps a half-written link with hideDanglingLink off", () => {
    expect(completePartialMarkdown("see [the act](htt", { hideDanglingLink: false })).toBe(
      "see [the act](htt"
    );
  });

  it("still balances marks when only the link option is off", () => {
    expect(completePartialMarkdown("*see [the act", { hideDanglingLink: false })).toBe(
      "*see [the act*"
    );
  });
});
