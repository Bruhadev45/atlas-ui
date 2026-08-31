import type * as React from "react";

/** Lets components set CSS custom properties without an `as` cast. */
export type CSSVars = React.CSSProperties & Record<`--${string}`, string | number>;

export type Density = "compact" | "comfortable";
export type Size = "sm" | "md" | "lg";
export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";
export type Side = "top" | "right" | "bottom" | "left";
export type Align = "start" | "center" | "end";
