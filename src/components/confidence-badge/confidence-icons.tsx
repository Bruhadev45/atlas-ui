import type * as React from "react";
import type { ConfidenceLevel } from "./confidence-badge.types";

/**
 * Four distinct shapes so a red/green-colourblind reader gets a second,
 * non-colour channel (WCAG 1.4.1): check (high), half-circle (medium),
 * triangle (low), slash-circle (insufficient). All inline SVG; no assets.
 */
type IconProps = React.SVGAttributes<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  focusable: "false",
};

export function CheckIcon(props: IconProps): React.JSX.Element {
  return (
    <svg {...base} {...props}>
      <path
        d="M3 8.5 6.5 12 13 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HalfCircleIcon(props: IconProps): React.JSX.Element {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" />
    </svg>
  );
}

export function TriangleIcon(props: IconProps): React.JSX.Element {
  return (
    <svg {...base} {...props}>
      <path
        d="M8 2.5 14.5 13.5H1.5L8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SlashCircleIcon(props: IconProps): React.JSX.Element {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.9 12.1 12.1 3.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function InfoIcon(props: IconProps): React.JSX.Element {
  return (
    <svg {...base} {...props}>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.25v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
    </svg>
  );
}

export const levelIcons: Record<
  ConfidenceLevel,
  (props: IconProps) => React.JSX.Element
> = {
  high: CheckIcon,
  medium: HalfCircleIcon,
  low: TriangleIcon,
  insufficient: SlashCircleIcon,
};
