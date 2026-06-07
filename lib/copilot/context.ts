/**
 * Snapshots the live Zustand simulator state into a compact, serialisable context
 * that is sent to the Copilot API (and on to an LLM). This is how the AISsistant
 * "reads" the simulator: temperatures, pressures, params vs optimal, alarms, P&L.
 */
import { PROCESSES, paramSeverity } from "@/lib/processes";
import { en } from "@/lib/i18n/en";
import { useSimStore } from "@/store/simStore";
import { computeCuts } from "@/store/refineryStore";

export interface CtxParam { id: string; label: string; value: number; unit: string; optimal: [number, number]; status: string }
export interface CtxOutput { id: string; label: string; value: number; unit: string }
export interface CtxAlarm { id: string; label: string; severity: string; value: number; limit: number; dir: string }
/** A live fractional-distillation cut (oil only). */
export interface CtxCut { name: string; carbon: string; bp: string; pct: number }

export interface CopilotContext {
  process: string;
  processName: string;
  running: boolean;
  speed: number;
  params: CtxParam[];
  outputs: CtxOutput[];
  alarms: CtxAlarm[];
  profit: number | null;
  co2: number | null;
  scenario: { id: string; status: string; remainingSec: number } | null;
  /** Oil only: live yield (%) of all 8 textbook fractions, light → heavy. */
  cuts?: CtxCut[];
}

const lbl = (rec: Record<string, { label: string }>, id: string) => rec[id]?.label ?? id;
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** Build the context from the current store state (call at send-time on the client). */
export function buildCopilotContext(): CopilotContext {
  const s = useSimStore.getState();
  const cfg = PROCESSES[s.activeProcessId];
  const p = s.params[s.activeProcessId];
  const out = s.outputs;

  const params: CtxParam[] = cfg.params.map((d) => {
    const value = p[d.id];
    return {
      id: d.id,
      label: lbl(en.param as Record<string, { label: string }>, d.id),
      value,
      unit: d.unit,
      optimal: [d.optimalMin, d.optimalMax],
      status: paramSeverity(d, value).severity,
    };
  });
  const outputs: CtxOutput[] = cfg.outputs.map((d) => ({
    id: d.id,
    label: lbl(en.output as Record<string, { label: string }>, d.id),
    value: out[d.id] ?? 0,
    unit: d.unit,
  }));
  const alarms: CtxAlarm[] = s.alarms.map((a) => ({
    id: a.id,
    label: lbl((a.kind === "param" ? en.param : en.output) as Record<string, { label: string }>, a.id),
    severity: a.severity,
    value: a.value,
    limit: a.limit,
    dir: a.direction,
  }));

  // Oil only: derive the live 8-fraction yields exactly as the tooltip / model do,
  // so the Copilot can reason about the product slate (cracking, bitumen shift, etc.).
  let cuts: CtxCut[] | undefined;
  if (cfg.id === "oil") {
    const effFeed = (p.oilFeedRate ?? 150) * ((p.crudePumpSpeed ?? 80) / 80);
    const vaporDeficit = clamp(1 - ((p.oilFurnaceTemp ?? 357) - 300) / Math.max(effFeed * 0.38, 1), 0, 1);
    const lightPenalty = clamp(1 - (p.airCoolerRpm ?? 1200) / 1100, 0, 1);
    cuts = computeCuts(p.oilFurnaceTemp ?? 357, { vaporDeficit, lightPenalty }).map((c) => ({
      name: c.name,
      carbon: c.carbon,
      bp: c.bp,
      pct: c.pct,
    }));
  }

  return {
    process: cfg.id,
    processName: en.process[cfg.id as keyof typeof en.process].name,
    running: s.running,
    speed: s.speed,
    params,
    outputs,
    alarms,
    profit: s.economics?.profit ?? null,
    co2: s.sustainability?.co2 ?? null,
    scenario: s.scenario ? { id: s.scenario.id, status: s.scenario.status, remainingSec: Math.round(s.scenario.remainingSec) } : null,
    cuts,
  };
}
