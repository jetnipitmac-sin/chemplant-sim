"use client";
import { useState } from "react";
import { Katex } from "@/components/ui/Katex";

/** Formula Inspector: an ƒ icon that reveals the governing equation (KaTeX) on hover/click. */
export function FormulaHint({ formula }: { formula?: string }) {
  const [open, setOpen] = useState(false);
  if (!formula) return null;
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid h-4 w-4 place-items-center rounded border border-edge text-[10px] italic text-muted transition hover:border-brand hover:text-brand"
        aria-label="formula"
      >
        ƒ
      </button>
      {open && (
        <span className="absolute bottom-6 left-1/2 z-50 w-max max-w-[300px] -translate-x-1/2 rounded-lg border border-edge bg-panel-2 px-3 py-2 text-[13px] leading-relaxed text-ink shadow-panel">
          <Katex math={formula} />
        </span>
      )}
    </span>
  );
}
