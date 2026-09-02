export interface PartialMarkdownOptions {
  /** Append a closing ``` when a fence is open. @default true */
  closeCodeFences?: boolean;
  /** Balance trailing `**`, `*`, `_`, `` ` ``. @default true */
  closeInlineMarks?: boolean;
  /** Drop a trailing half-written `[text](htt` so no broken link flashes. @default true */
  hideDanglingLink?: boolean;
}

/* CommonMark: up to three leading spaces, then a run of three or more. */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/*
 * A link that is still being written, anchored to the end of the text: an open
 * `[`, a closed `[label]` with nothing after it, or an open `(` destination.
 * A finished `[label](url)` cannot match, because `[^)\n]*` never crosses `)`.
 */
const DANGLING_LINK_RE = /!?\[[^\]\n]*(\](\([^)\n]*)?)?$/;

const ALNUM = /[\p{L}\p{N}]/u;
const SPACE = /\s/;
/* Stands in for a closed code span while emphasis is counted. */
const SPAN = "\uFFFC";

/**
 * The fence run left open at the end of `text`, or null. Info strings are
 * allowed on the opener only, and a backtick fence's info string may not
 * itself contain a backtick.
 */
function findOpenFence(text: string): string | null {
  let open: string | null = null;
  for (const line of text.split("\n")) {
    const match = FENCE_RE.exec(line);
    if (!match) continue;
    const run = match[1] ?? "";
    const info = match[2] ?? "";
    if (open === null) {
      if (run.startsWith("`") && info.includes("`")) continue;
      open = run;
    } else if (run[0] === open[0] && run.length >= open.length && info.trim() === "") {
      open = null;
    }
  }
  return open;
}

/**
 * Replaces each closed code span with `SPAN`, since markdown treats its
 * contents as literal: emphasis is then counted only where it can take effect,
 * while the placeholder keeps the flanking of neighbouring runs intact.
 * `openTicks` is the length of a span the text ends inside of.
 */
function stripCodeSpans(text: string): { plain: string; openTicks: number } {
  let plain = "";
  let openTicks = 0;
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "`") {
      if (openTicks === 0) plain += text[i];
      i += 1;
      continue;
    }
    let run = 0;
    while (text[i + run] === "`") run += 1;
    if (openTicks === 0) {
      openTicks = run;
    } else if (openTicks === run) {
      openTicks = 0;
      plain += SPAN;
    }
    i += run;
  }
  return { plain, openTicks };
}

/**
 * Walks emphasis delimiters with a stack so nested marks close innermost-first.
 * Returns the characters to append and how many to drop from the end.
 */
function scanEmphasis(plain: string, canDrop: boolean): { suffix: string; drop: number } {
  const stack: string[] = [];
  let head = "";
  let drop = 0;
  let i = 0;

  while (i < plain.length) {
    const char = plain[i];
    if (char === "\\") {
      i += 2;
      continue;
    }
    if (char !== "*" && char !== "_") {
      i += 1;
      continue;
    }

    let run = 0;
    while (plain[i + run] === char) run += 1;
    const before = plain[i - 1] ?? "";
    const after = plain[i + run] ?? "";
    /* `_` between word characters is snake_case, never emphasis. */
    const intraword = char === "_" && ALNUM.test(before) && ALNUM.test(after);
    /* CommonMark flanking, reduced to the part that matters here: a run
       followed by whitespace cannot open, one preceded by whitespace cannot
       close. Without it "5 * 3" would grow a closing asterisk. */
    const canOpen = after !== "" && !SPACE.test(after);
    const canClose = before !== "" && !SPACE.test(before);
    const trailing = canDrop && i + run === plain.length;

    if (!intraword) {
      let rest = run;
      while (canClose && rest > 0 && stack.length > 0) {
        const top = stack[stack.length - 1];
        if (top === undefined || top[0] !== char) break;
        if (top.length <= rest) {
          rest -= top.length;
          stack.pop();
          continue;
        }
        /* Half of a closer the model has not finished typing: finish it. */
        if (!trailing) break;
        head = char.repeat(top.length - rest);
        rest = 0;
        stack.pop();
      }
      /* A run at the very end opens nothing, so it is dropped rather than
         balanced — the same reasoning as `hideDanglingLink`. */
      if (trailing) {
        drop = rest;
      } else if (canOpen) {
        while (rest >= 2) {
          stack.push(char + char);
          rest -= 2;
        }
        if (rest === 1) stack.push(char);
      }
    }
    i += run;
  }

  const pending = [...stack].reverse().join("");
  return { suffix: head + pending, drop };
}

function repairInlineMarks(text: string): string {
  const { plain, openTicks } = stripCodeSpans(text);
  /* A code span opened at the very end wraps nothing yet; dropping the run
     beats rendering an empty `` `` `` pair. */
  if (openTicks > 0 && text.endsWith("`".repeat(openTicks))) {
    return repairInlineMarks(text.slice(0, text.length - openTicks));
  }
  /* Only a run at the end of the *text* is mid-token; an open code span means
     the emphasis run sits inside it and is literal. */
  const { suffix, drop } = scanEmphasis(plain, openTicks === 0);
  const body = drop > 0 ? text.slice(0, text.length - drop) : text;
  return body + "`".repeat(openTicks) + suffix;
}

/** Pure. Returns text safe to hand to a markdown renderer mid-stream. */
export function completePartialMarkdown(
  text: string,
  options: PartialMarkdownOptions = {}
): string {
  const {
    closeCodeFences = true,
    closeInlineMarks = true,
    hideDanglingLink = true,
  } = options;
  if (text.length === 0) return text;

  const openFence = findOpenFence(text);
  if (openFence !== null) {
    /* Inside a fence every inline mark is literal, so the fence is the only
       repair that applies. */
    if (!closeCodeFences) return text;
    return text.endsWith("\n") ? text + openFence : `${text}\n${openFence}`;
  }

  let out = text;
  if (hideDanglingLink) {
    const start = out.search(DANGLING_LINK_RE);
    if (start !== -1) out = out.slice(0, start);
  }
  if (closeInlineMarks) out = repairInlineMarks(out);
  return out;
}
