/**
 * Domain model for the chemical process simulation.
 *
 * The plant is a simple but coherent process train:
 *
 *   T-101 (Feed Tank) ─► P-101 (Pump) ─► R-101 (CSTR Reactor) ─► C-101 (Distillation)
 *                                                                     │
 *                                              top ─► D-101 (Product B Tank)
 *                                              bot ─► D-102 (Bottoms / Recycle Tank)
 *
 * The reactor runs an exothermic, irreversible reaction  A ─► B  with Arrhenius
 * kinetics and a cooling jacket (the classic Seborg CSTR). The column performs a
 * simplified B/A separation driven by reflux ratio and reboiler duty.
 */

export type EquipmentId = "T-101" | "P-101" | "R-101" | "C-101" | "D-101" | "D-102";

export type EquipmentKind = "tank" | "pump" | "reactor" | "column";

export type AlarmSeverity = "normal" | "warning" | "critical";

/** Live state of a single unit operation, mirrored from the engine each tick. */
export interface EquipmentState {
  id: EquipmentId;
  name: string;
  kind: EquipmentKind;
  /** Bulk temperature (K). */
  temperature: number;
  /** Pressure (bar, absolute-ish). */
  pressure: number;
  /** Inventory level (%) — for vessels/tanks. */
  level: number;
  /** Volumetric flow in / out (L/min). */
  flowIn: number;
  flowOut: number;
  /** Worst alarm severity currently attached to this unit (drives visuals). */
  status: AlarmSeverity;

  // --- reactor-specific ---
  /** Concentration of reactant A (mol/L). */
  Ca?: number;
  /** Concentration of product B (mol/L). */
  Cb?: number;
  /** Fractional conversion of A. */
  conversion?: number;
  /** Jacket coolant temperature (K). */
  coolantTemp?: number;
  /** Reaction rate constant k (1/min). */
  rateConstant?: number;

  // --- column-specific ---
  /** Distillate (top) product purity, fraction of B. */
  purity?: number;
  topTemp?: number;
  bottomTemp?: number;
  distillateFlow?: number;
  bottomsFlow?: number;

  /** Thermal duty (kW) — jacket for reactor, reboiler for column. */
  duty?: number;
}

/** Operator-adjustable inputs. These flow main-thread ─► worker. */
export interface ControlInputs {
  /** Pump P-101 setpoint = reactor feed flow (L/min). */
  feedFlow: number;
  /** Feed temperature into reactor (K). */
  feedTemp: number;
  /** Feed concentration of A, Caf (mol/L). */
  feedConcentration: number;
  /** Reactor jacket coolant temperature, Tc (K) — the main lever for runaway. */
  coolantTemp: number;
  /** Column reflux ratio (-). */
  refluxRatio: number;
  /** Column reboiler duty (kW). */
  reboilerDuty: number;
  /** Agitator speed (rpm) — improves jacket heat transfer (UA) via mixing. */
  agitatorRpm: number;
  /** Coolant flow rate (L/min) — scales effective jacket cooling (UA). */
  coolantFlow: number;
  /** Catalyst concentration (g/L) — scales the reaction rate constant k. */
  catalyst: number;
  /** Headspace / system pressure setpoint (bar) — baseline for reactor pressure. */
  systemPressure: number;
  /** Whether the integrator is advancing. */
  running: boolean;
  /** Sim-time acceleration multiplier. */
  speed: number;
}

export interface Alarm {
  id: string;
  equipmentId: EquipmentId;
  variable: "Temperature" | "Pressure" | "Level";
  severity: AlarmSeverity;
  message: string;
  value: number;
  limit: number;
  /** Sim-time (minutes) when the alarm first activated. */
  timestamp: number;
}

export interface Kpis {
  /** Product B production rate (kg/h). */
  production: number;
  /** Reactor conversion of A (fraction). */
  conversion: number;
  /** Distillate purity (fraction B). */
  purity: number;
  /** Total thermal energy use (kW). */
  energyUse: number;
  /** Composite safety score 0–100. */
  safetyScore: number;
}

/** Everything the UI needs for one frame of simulation. */
export interface SimSnapshot {
  /** Elapsed simulation time (minutes). */
  time: number;
  /** Wall-clock timestamp (ms) when produced. */
  wallClock: number;
  equipment: Record<EquipmentId, EquipmentState>;
  alarms: Alarm[];
  kpis: Kpis;
}

/** Compact record appended to the rolling trend history (for charts). */
export interface TrendPoint {
  t: number; // sim minutes
  reactorT: number;
  reactorP: number;
  conversion: number; // %
  purity: number; // %
  production: number; // kg/h
  feedFlow: number; // L/min
  coolantTemp: number; // K
  safetyScore: number;
}

// ---- worker message protocol ----

export type WorkerInbound =
  | { type: "init"; controls: ControlInputs }
  | { type: "control"; controls: Partial<ControlInputs> }
  | { type: "reset" };

export type WorkerOutbound = { type: "snapshot"; snapshot: SimSnapshot };
