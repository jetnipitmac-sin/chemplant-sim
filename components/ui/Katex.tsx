"use client";
import { useMemo } from "react";
import katex from "katex";

/** Renders a LaTeX string with KaTeX (inline or display). */
export function Katex({ math, display = false, className = "" }: { math: string; display?: boolean; className?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, { throwOnError: false, displayMode: display, output: "htmlAndMathml" });
    } catch {
      return math;
    }
  }, [math, display]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
