/**
 * Crisp line-art logo per process (SVG, `currentColor` so it tints with the
 * process accent). Replaces the old emoji glyphs, which rendered inconsistently
 * across browsers/OSes and showed as empty boxes in some environments.
 */
import type { CSSProperties } from "react";
import type { ProcessId } from "@/lib/processes";

export function ProcessIcon({
  id,
  className = "h-5 w-5",
  style,
}: {
  id: ProcessId;
  className?: string;
  style?: CSSProperties;
}) {
  const p = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    style,
  };

  switch (id) {
    // Oil Refining — distillation column with side draw-offs
    case "oil":
      return (
        <svg {...p}>
          <rect x="8" y="3" width="8" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h8" />
          <path d="M16 6h4M16 18h3.5" />
        </svg>
      );
    // Cement — inclined rotary kiln with tyre rings
    case "cement":
      return (
        <svg {...p}>
          <g transform="rotate(-12 12 12)">
            <rect x="2" y="9.5" width="20" height="5" rx="2.5" />
            <path d="M8 9.5v5M15 9.5v5" />
          </g>
        </svg>
      );
    // Power Boiler — flame
    case "boiler":
      return (
        <svg {...p}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5Z" />
        </svg>
      );
    // Gas Separation Plant — snowflake (cryogenic)
    case "gsp":
      return (
        <svg {...p}>
          <path d="M12 2.5v19M4.1 7l15.8 10M19.9 7 4.1 17" />
          <path d="M9.6 3.6 12 5.2l2.4-1.6M9.6 20.4 12 18.8l2.4 1.6" />
        </svg>
      );
    // Chemical Reactor — Erlenmeyer flask
    case "cstr":
      return (
        <svg {...p}>
          <path d="M9 3h6" />
          <path d="M10 3v6l-4.6 8.3A1.6 1.6 0 0 0 6.8 20h10.4a1.6 1.6 0 0 0 1.4-2.7L14 9V3" />
          <path d="M7.7 15h8.6" />
        </svg>
      );
    default:
      return null;
  }
}
