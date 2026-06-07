/**
 * Render a CopilotContext snapshot into a clean, human-readable block for the
 * LLM system prompt (much friendlier for the model than raw JSON). Pure — no
 * store imports — so it is safe to use in the server route.
 */
import type { CopilotContext } from "./context";

const SEV_ICON: Record<string, string> = { optimal: "✓", warning: "⚠", danger: "⛔" };

const fmt = (n: number) => {
  const a = Math.abs(n);
  return a >= 1000 ? Math.round(n).toLocaleString() : a >= 100 ? n.toFixed(0) : a >= 10 ? n.toFixed(1) : n.toFixed(2);
};

export function formatCopilotContext(c: CopilotContext): string {
  const L: string[] = [];

  L.push(`PROCESS    : ${c.processName} (${c.process})`);
  L.push(
    `SIMULATION : ${c.running ? "RUNNING" : "PAUSED"} · ${c.speed}× speed` +
      (c.profit != null ? `   |   Profit $${fmt(c.profit)}/hr` : "") +
      (c.co2 != null ? `   |   CO₂ ${fmt(c.co2)} kg/hr` : ""),
  );

  L.push("");
  L.push("CONTROLS (operator setpoints):");
  for (const p of c.params) {
    const flag = p.status !== "optimal" ? `  «${p.status.toUpperCase()}»` : "";
    L.push(`  ${SEV_ICON[p.status] ?? "·"} ${p.label.padEnd(24)} ${fmt(p.value)} ${p.unit}   [optimal ${fmt(p.optimal[0])}–${fmt(p.optimal[1])}]${flag}`);
  }

  L.push("");
  L.push("OUTPUTS (live results):");
  for (const o of c.outputs) L.push(`  • ${o.label.padEnd(24)} ${fmt(o.value)} ${o.unit}`);

  if (c.cuts?.length) {
    L.push("");
    L.push("DISTILLATION PRODUCT SLATE (live yields, light → heavy):");
    c.cuts.forEach((cut, i) => L.push(`  ${i + 1}. ${cut.name} (${cut.carbon}, ${cut.bp}) — ${cut.pct.toFixed(1)} %`));
  }

  L.push("");
  if (c.alarms.length) {
    L.push("ACTIVE ALARMS:");
    for (const a of c.alarms) {
      L.push(`  ${a.severity === "critical" ? "⛔" : "⚠"} ${a.label} = ${fmt(a.value)} (${a.dir === "high" ? "≥" : "≤"} ${fmt(a.limit)}) [${a.severity}]`);
    }
  } else {
    L.push("ACTIVE ALARMS: none — all within limits");
  }

  if (c.scenario) {
    L.push("");
    L.push(`MISSION    : ${c.scenario.id} — ${c.scenario.status}${c.scenario.status === "running" ? `, ${c.scenario.remainingSec}s left` : ""}`);
  }

  return L.join("\n");
}
