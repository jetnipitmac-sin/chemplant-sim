/** Compact, URL-safe encoding of a "run" (process + parameter setpoints + language). */
import type { ProcessId } from "@/lib/processes";

export interface RunSnapshot {
  p: ProcessId;
  v: Record<string, number>;
  l: "en" | "th";
}

export function encodeRun(s: RunSnapshot): string {
  return btoa(encodeURIComponent(JSON.stringify(s)));
}

export function decodeRun(str: string): RunSnapshot | null {
  try {
    const obj = JSON.parse(decodeURIComponent(atob(str)));
    if (obj && typeof obj.p === "string" && obj.v && typeof obj.v === "object") return obj as RunSnapshot;
    return null;
  } catch {
    return null;
  }
}
