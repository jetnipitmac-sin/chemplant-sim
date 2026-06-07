/**
 * Process-configuration domain model for the Educational Multi-Process Simulator.
 *
 * Every industrial process (Oil Refining, Cement, CSTR) is described by the same
 * shape: a set of guided parameters (each with an optimal range + consequence
 * messages), the governing formulas, the live outputs, and a pure `model` that
 * maps parameter values → outputs. UI text is referenced by i18n keys only, so
 * everything is translatable (EN/TH).
 */

export type ProcessId = "oil" | "cement" | "cstr" | "boiler" | "gsp";

/** Severity of a parameter relative to its optimal band. */
export type Severity = "optimal" | "warning" | "danger";

export interface ParamDef {
  /** Unique camelCase id; also the i18n sub-key (param.<id>.label/.info/.low/.high). */
  id: string;
  /** Raw unit symbol (not translated, e.g. "°C", "kPa", "rpm"). */
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /**
   * Three operational bands (DCS-style):
   *   value ∈ [optimalMin, optimalMax]            → Optimal (green)
   *   value beyond optimal but inside danger      → Warning (yellow)
   *   value ≤ dangerLow  OR  value ≥ dangerHigh   → Critical (red)
   */
  optimalMin: number;
  optimalMax: number;
  dangerLow?: number;
  dangerHigh?: number;
  /** Display precision. */
  decimals?: number;
  /** Plain-text engineering equation shown by the Formula Inspector tooltip. */
  formula?: string;
}

export interface FormulaDef {
  /** i18n sub-key: formula.<id>.title / .desc */
  id: string;
  /** LaTeX source, rendered with KaTeX. */
  tex: string;
}

export interface OutputDef {
  /** Output id returned by the model; also i18n sub-key output.<id>.label */
  id: string;
  unit: string;
  decimals?: number;
  /** Higher is better? drives the trend colouring. */
  betterHigher?: boolean;
  /** Include this output in the live trend chart (each graphed output gets its own panel). */
  graph?: boolean;
  /** Line colour in the trend chart. */
  color?: string;
  /** Trend reference lines + alarm thresholds. */
  warnLimit?: number;
  dangerLimit?: number;
  /** Which side of the limits is unsafe (default "high"). */
  limitDirection?: "high" | "low";
  /** Plain-text engineering equation shown by the Formula Inspector tooltip. */
  formula?: string;
  /**
   * First-order time constant (seconds) for `dynamic` processes: the displayed
   * value lags toward the model's steady-state target with this τ, so trends
   * ramp/settle instead of stepping. Larger τ = slower (thermal mass); omit for
   * a sensible default. Ignored unless the ProcessConfig sets `dynamic: true`.
   */
  tau?: number;
}

/**
 * A guided "mission": applies `setup` overrides to create a hazardous state, then
 * the trainee must clear all CRITICAL alarms and hold safe for `holdSec` before
 * `durationSec` elapses.
 */
export interface ScenarioDef {
  id: string; // i18n: scenario.<id>.title / .brief
  durationSec: number;
  holdSec: number;
  setup: Record<string, number>;
}

/** Real-time plant economics (all values in $/hr). */
export interface EconomicsResult {
  revenue: number;
  feedCost: number;
  energyCost: number;
  coolingCost: number;
  profit: number; // revenue − (feed + energy + cooling)
}

/** Real-time emissions & sustainability. */
export interface SustainabilityResult {
  co2: number; // kg CO₂ / hr
  intensity: number; // kg CO₂ per unit product
  score: number; // 0–100 (higher = cleaner)
}

/** One active alarm (a parameter in danger, or an output past its limit). */
export interface ProcessAlarm {
  id: string;
  kind: "param" | "output";
  severity: "warning" | "critical";
  value: number;
  limit: number;
  direction: "high" | "low";
}

/** A clickable unit operation: groups the parameters a user adjusts on it, plus
 *  a 3D ground anchor for the selection highlight. Text via unit.<id>.name/.how */
export interface UnitDef {
  id: string;
  paramIds: string[];
  /** Ground position [x,y,z] for the 3D selection ring (algebraic scenes). */
  ring?: [number, number, number];
}

/**
 * A single-loop PID controller. In **Auto** it drives a process variable (`pv`,
 * an output) to a `sp` setpoint by manipulating a parameter (`mv`). The PID is
 * positional with the MV's default as bias + anti-windup; gains are user-tunable.
 * Text via loop.<id>.name.
 */
export interface ControlLoop {
  id: string;
  /** Output id used as the measured process variable. */
  pv: string;
  /** Param id manipulated by the controller. */
  mv: string;
  /** Default setpoint (in PV units) + slider range. */
  sp: number;
  spMin: number;
  spMax: number;
  /** Default PID gains (tunable in the UI). */
  kp: number;
  ki: number;
  kd: number;
  /** True if increasing the MV *decreases* the PV (reverse-acting). */
  reverse?: boolean;
}

export interface ProcessConfig {
  id: ProcessId;
  /** i18n sub-key: process.<id>.name / .tagline / .desc */
  accent: string; // hex accent colour
  icon: string; // short glyph/emoji for the selector
  params: ParamDef[];
  formulas: FormulaDef[];
  outputs: OutputDef[];
  /** Clickable unit operations (each owns a subset of params). */
  units: UnitDef[];
  /** Guided "missions" for this process. */
  scenarios: ScenarioDef[];
  /** Optional single-loop PID controllers the trainee can put in Auto/Manual. */
  loops?: ControlLoop[];
  /** Pure function: parameter values → output values. */
  model: (p: Record<string, number>) => Record<string, number>;
  /** Real-time P&L from the current params + outputs. */
  economics: (p: Record<string, number>, o: Record<string, number>) => EconomicsResult;
  /** Real-time CO₂ emissions + sustainability score. */
  sustainability: (p: Record<string, number>, o: Record<string, number>) => SustainabilityResult;
  /** Whether this process is backed by the live ODE worker (CSTR) vs algebraic. */
  live?: boolean;
  /**
   * Apply first-order lag to the algebraic outputs so the plant responds with
   * inertia (trends ramp toward the new steady state instead of stepping). Each
   * output lags with its own `tau`. The live CSTR already has real dynamics.
   */
  dynamic?: boolean;
}

/** One active deviation surfaced by the consequence engine. */
export interface Consequence {
  paramId: string;
  direction: "low" | "high";
  severity: Exclude<Severity, "optimal">;
  value: number;
}

/** Classify a parameter value against its optimal band. */
export function paramSeverity(def: ParamDef, value: number): { severity: Severity; direction: "low" | "high" | null } {
  if (value < def.optimalMin) {
    const danger = def.dangerLow !== undefined && value <= def.dangerLow;
    return { severity: danger ? "danger" : "warning", direction: "low" };
  }
  if (value > def.optimalMax) {
    const danger = def.dangerHigh !== undefined && value >= def.dangerHigh;
    return { severity: danger ? "danger" : "warning", direction: "high" };
  }
  return { severity: "optimal", direction: null };
}

/** Evaluate every parameter and return the active (non-optimal) consequences, worst first. */
export function evaluateConsequences(config: ProcessConfig, params: Record<string, number>): Consequence[] {
  const rank = { danger: 2, warning: 1 } as const;
  return config.params
    .map((def): Consequence | null => {
      const v = params[def.id] ?? def.default;
      const { severity, direction } = paramSeverity(def, v);
      if (severity === "optimal" || direction === null) return null;
      return { paramId: def.id, direction, severity, value: v };
    })
    .filter((c): c is Consequence => c !== null)
    .sort((a, b) => rank[b.severity] - rank[a.severity]);
}

/** Evaluate an output value against its warn/danger limits. */
function outputSeverity(def: OutputDef, value: number): { severity: ProcessAlarm["severity"] | "ok"; limit: number } {
  const dir = def.limitDirection ?? "high";
  if (dir === "high") {
    if (def.dangerLimit !== undefined && value >= def.dangerLimit) return { severity: "critical", limit: def.dangerLimit };
    if (def.warnLimit !== undefined && value >= def.warnLimit) return { severity: "warning", limit: def.warnLimit };
  } else {
    if (def.dangerLimit !== undefined && value <= def.dangerLimit) return { severity: "critical", limit: def.dangerLimit };
    if (def.warnLimit !== undefined && value <= def.warnLimit) return { severity: "warning", limit: def.warnLimit };
  }
  return { severity: "ok", limit: 0 };
}

/**
 * The Consequence/Alarm engine: returns every active alarm (parameters in
 * warning/danger + outputs past their limits), worst first.
 */
export function evaluateAlarms(
  config: ProcessConfig,
  params: Record<string, number>,
  outputs: Record<string, number>,
): ProcessAlarm[] {
  const rank = { critical: 2, warning: 1 } as const;
  const alarms: ProcessAlarm[] = [];

  for (const def of config.params) {
    const v = params[def.id] ?? def.default;
    const { severity, direction } = paramSeverity(def, v);
    if (severity === "optimal" || direction === null) continue;
    const limit =
      direction === "high"
        ? (severity === "danger" ? def.dangerHigh ?? def.optimalMax : def.optimalMax)
        : (severity === "danger" ? def.dangerLow ?? def.optimalMin : def.optimalMin);
    alarms.push({
      id: def.id,
      kind: "param",
      severity: severity === "danger" ? "critical" : "warning",
      value: v,
      limit,
      direction,
    });
  }

  for (const def of config.outputs) {
    if (def.warnLimit === undefined && def.dangerLimit === undefined) continue;
    const v = outputs[def.id];
    if (v === undefined) continue;
    const { severity, limit } = outputSeverity(def, v);
    if (severity === "ok") continue;
    alarms.push({ id: def.id, kind: "output", severity, value: v, limit, direction: def.limitDirection ?? "high" });
  }

  return alarms.sort((a, b) => rank[b.severity] - rank[a.severity]);
}

export const hasCritical = (alarms: ProcessAlarm[]) => alarms.some((a) => a.severity === "critical");
