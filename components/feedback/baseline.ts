/**
 * Merge a frozen baseline buffer into the live trend data for run-vs-run
 * comparison. The baseline is tail-aligned to the live window (the most recent
 * points line up), and each requested key is exposed as `__b_<key>` so a chart
 * can plot it as a dimmed, dashed "ghost" line beside the live one.
 */
export function withBaseline(
  data: Array<Record<string, number>>,
  baseline: Array<Record<string, number>> | null,
  keys: string[],
): Array<Record<string, number>> {
  if (!baseline || baseline.length === 0) return data;
  const n = data.length;
  const m = baseline.length;
  return data.map((row, i) => {
    const bi = m - (n - i); // last live point ↔ last baseline point
    if (bi < 0) return row;
    const b = baseline[bi];
    const out: Record<string, number> = { ...row };
    for (const k of keys) {
      const v = b[k];
      if (v !== undefined) out[`__b_${k}`] = v;
    }
    return out;
  });
}
