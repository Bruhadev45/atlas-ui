import type { ToolCall } from "./tool-call-timeline.types";

/**
 * Explicit `durationMs` wins over the timestamp pair. A call that is still
 * running has no duration: the component renders no timers, so a ticking
 * elapsed time would be a lie the moment React stopped re-rendering.
 */
export function callDuration(call: ToolCall): number | undefined {
  if (typeof call.durationMs === "number") return call.durationMs;
  if (typeof call.startedAt === "number" && typeof call.endedAt === "number") {
    return Math.max(0, call.endedAt - call.startedAt);
  }
  return undefined;
}

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60_000;

function plural(value: number, unit: string): string {
  return value === 1 ? `${value} ${unit}` : `${value} ${unit}s`;
}

/**
 * Screen-reader duration: "820 milliseconds", not "820ms". Abbreviated units
 * are read inconsistently across engines ("ms" as "em ess", "8.2s" as "8.2
 * seconds" or "8.2 s"), and the row's accessible name is the only place the
 * duration is spelled out.
 */
export function spellDuration(ms: number): string {
  if (ms < MS_PER_SECOND) return plural(Math.round(ms), "millisecond");
  if (ms < MS_PER_MINUTE) return plural(Math.round((ms / MS_PER_SECOND) * 10) / 10, "second");
  const minutes = Math.floor(ms / MS_PER_MINUTE);
  const seconds = Math.round((ms % MS_PER_MINUTE) / MS_PER_SECOND);
  return seconds > 0
    ? `${plural(minutes, "minute")} ${plural(seconds, "second")}`
    : plural(minutes, "minute");
}

/** Total number of calls below `calls`, used by the `maxDepth` fold row. */
export function countDescendants(calls: readonly ToolCall[]): number {
  return calls.reduce((total, call) => total + 1 + countDescendants(call.children ?? []), 0);
}

/** Depth-first (execution order) flattening of the whole tree. */
export function flattenCalls(calls: readonly ToolCall[]): ToolCall[] {
  return calls.flatMap((call) => [call, ...flattenCalls(call.children ?? [])]);
}
