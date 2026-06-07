"use client";
import { useSimStore } from "@/store/simStore";

/** Snapshot the current trend window as a comparison baseline (or clear it). */
export function CompareButton() {
  const baseline = useSimStore((s) => s.baseline);
  const snap = useSimStore((s) => s.snapshotBaseline);
  const clear = useSimStore((s) => s.clearBaseline);
  return (
    <button
      className={`btn px-2 py-1 text-xs ${baseline ? "border-brand/50 text-brand" : ""}`}
      onClick={() => (baseline ? clear() : snap())}
      title={baseline ? "Clear the comparison baseline" : "Snapshot the current run as a comparison baseline"}
    >
      {baseline ? "✕ Baseline" : "◫ Compare"}
    </button>
  );
}
