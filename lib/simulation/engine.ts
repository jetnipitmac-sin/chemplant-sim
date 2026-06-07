/**
 * PlantSimulator — the process "physics".
 *
 * The reactor (R-101) is a rigorous exothermic CSTR (A → B) with Arrhenius
 * kinetics and a cooling jacket, integrated with RK4. The kinetics are a tamed
 * variant of the classic Seborg CSTR (lower ΔH_rxn) so the thermal response is
 * smooth, single-valued and bounded — yet still drives a genuine thermal-runaway
 * when the operator starves the cooling, over-feeds, or over-concentrates.
 *
 * The distillation column (C-101) and the tanks use lumped, first-order
 * mass/energy balances — enough to give physically-sensible, responsive
 * temperature / pressure / flow / level dynamics across the whole train.
 *
 * The numbers below were validated offline (see commit notes): nominal settles
 * at T ≈ 362 K / 70 % conversion with a comfortable margin to the 395 K alarm.
 */

import type {
  Alarm,
  AlarmSeverity,
  ControlInputs,
  EquipmentId,
  EquipmentState,
  Kpis,
  SimSnapshot,
} from "./types";

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

// ---- physical / kinetic constants (units in comments) ----
const PROC = {
  V: 100, // reactor volume, L
  rhoCp: 239, // ρ·Cp of the liquid, J/(L·K)
  negDH: 1.3e4, // −ΔH_rxn, J/mol (exothermic)
  EoverR: 8750, // activation energy / R, K
  k0: 7.2e10, // Arrhenius pre-exponential, 1/min
  UA: 5.0e4, // jacket heat-transfer coefficient·area, J/(min·K)
  MW_B: 60, // molar mass of product B, g/mol
};

// ---- alarm limits per unit/variable ----
type LimitSpec = {
  warnHi?: number;
  critHi?: number;
  warnLo?: number;
  critLo?: number;
  unit: string;
};
export const LIMITS: Partial<
  Record<EquipmentId, Partial<Record<"Temperature" | "Pressure" | "Level", LimitSpec>>>
> = {
  "R-101": {
    Temperature: { warnHi: 395, critHi: 415, unit: "K" },
    Pressure: { warnHi: 4.4, critHi: 5.2, unit: "bar" },
  },
  "C-101": {
    Temperature: { warnHi: 430, critHi: 460, unit: "K" },
    Pressure: { warnHi: 2.6, critHi: 3.2, unit: "bar" },
  },
  "T-101": { Level: { warnHi: 90, critHi: 97, warnLo: 12, critLo: 5, unit: "%" } },
  "D-101": { Level: { warnHi: 90, critHi: 97, warnLo: 8, critLo: 3, unit: "%" } },
  "D-102": { Level: { warnHi: 90, critHi: 97, warnLo: 8, critLo: 3, unit: "%" } },
};

export const EQUIPMENT_META: Record<EquipmentId, { name: string; kind: EquipmentState["kind"] }> = {
  "T-101": { name: "Feed Tank", kind: "tank" },
  "P-101": { name: "Feed Pump", kind: "pump" },
  "R-101": { name: "CSTR Reactor", kind: "reactor" },
  "C-101": { name: "Distillation Column", kind: "column" },
  "D-101": { name: "Product Tank (B)", kind: "tank" },
  "D-102": { name: "Bottoms Tank (A)", kind: "tank" },
};

export const DEFAULT_CONTROLS: ControlInputs = {
  feedFlow: 100, // L/min
  feedTemp: 350, // K
  feedConcentration: 1.0, // mol/L
  coolantTemp: 350, // K
  refluxRatio: 2.0, // -
  reboilerDuty: 250, // kW
  agitatorRpm: 160, // rpm  (nominal → mix factor 1.0)
  coolantFlow: 90, // L/min (nominal → cool factor 1.0)
  catalyst: 5, // g/L   (nominal → k factor 1.0)
  systemPressure: 2.5, // bar
  running: true,
  speed: 1,
};

// Control envelope used by sliders (UI) and clamped by the engine.
export const CONTROL_RANGES = {
  feedFlow: { min: 20, max: 160, step: 1, unit: "L/min" },
  feedTemp: { min: 320, max: 420, step: 1, unit: "K" },
  feedConcentration: { min: 0.5, max: 2.0, step: 0.05, unit: "mol/L" },
  coolantTemp: { min: 280, max: 410, step: 1, unit: "K" },
  refluxRatio: { min: 0.5, max: 6, step: 0.1, unit: "" },
  reboilerDuty: { min: 0, max: 600, step: 10, unit: "kW" },
} as const;

const SEVERITY_RANK: Record<AlarmSeverity, number> = { normal: 0, warning: 1, critical: 2 };

interface ReactorState {
  Ca: number;
  Cb: number;
  T: number;
}

interface ColumnState {
  topTemp: number;
  bottomTemp: number;
  purity: number; // xD, fraction B in distillate
}

export class PlantSimulator {
  private controls: ControlInputs;
  time = 0; // sim minutes

  private reactor: ReactorState = { Ca: 1, Cb: 0, T: 350 };
  private column: ColumnState = { topTemp: 340, bottomTemp: 375, purity: 0.5 };
  private levels = { "T-101": 60, "D-101": 50, "D-102": 50 };

  // derived values cached each step for the snapshot
  private d = {
    feedMakeup: 100,
    distillate: 0,
    bottoms: 0,
    draw101: 0,
    draw102: 0,
    k: 0,
    jacketDutyKW: 0,
  };

  private activeAlarms = new Map<string, Alarm>();

  constructor(controls: ControlInputs = DEFAULT_CONTROLS) {
    this.controls = { ...controls };
    // seed reactor temperature at the feed temperature
    this.reactor.T = controls.feedTemp;
    this.reactor.Ca = controls.feedConcentration;
  }

  setControls(partial: Partial<ControlInputs>) {
    this.controls = { ...this.controls, ...partial };
  }

  getControls(): ControlInputs {
    return { ...this.controls };
  }

  reset() {
    this.time = 0;
    this.reactor = { Ca: this.controls.feedConcentration, Cb: 0, T: this.controls.feedTemp };
    this.column = { topTemp: 340, bottomTemp: 375, purity: 0.5 };
    this.levels = { "T-101": 60, "D-101": 50, "D-102": 50 };
    this.activeAlarms.clear();
  }

  /** Catalyst activity multiplier on k (nominal 5 g/L → 1.0). */
  private kFactor() {
    return clamp((this.controls.catalyst ?? 5) / 5, 0.05, 2.4);
  }

  /** Effective jacket UA, scaled by agitation (mixing) and coolant flow. */
  private uaEff() {
    const mix = clamp(0.45 + 0.55 * ((this.controls.agitatorRpm ?? 160) / 160), 0.3, 1.4);
    const cool = clamp((this.controls.coolantFlow ?? 90) / 90, 0.2, 1.5);
    return PROC.UA * mix * cool;
  }

  /** Reactor ODE right-hand side at a candidate state, used by RK4. */
  private reactorDeriv([Ca, Cb, T]: [number, number, number]): [number, number, number] {
    const { feedFlow: q, feedConcentration: Caf, feedTemp: Tf, coolantTemp: Tc } = this.controls;
    const k = PROC.k0 * this.kFactor() * Math.exp(-PROC.EoverR / T);
    const UA = this.uaEff();
    const dCa = (q / PROC.V) * (Caf - Ca) - k * Ca;
    const dCb = -(q / PROC.V) * Cb + k * Ca;
    const dT =
      (q / PROC.V) * (Tf - T) +
      (PROC.negDH / PROC.rhoCp) * k * Ca -
      (UA / (PROC.rhoCp * PROC.V)) * (T - Tc);
    return [dCa, dCb, dT];
  }

  private stepReactor(dt: number) {
    let y: [number, number, number] = [this.reactor.Ca, this.reactor.Cb, this.reactor.T];
    const add = (
      a: [number, number, number],
      b: [number, number, number],
      s: number,
    ): [number, number, number] => [a[0] + s * b[0], a[1] + s * b[1], a[2] + s * b[2]];

    const k1 = this.reactorDeriv(y);
    const k2 = this.reactorDeriv(add(y, k1, dt / 2));
    const k3 = this.reactorDeriv(add(y, k2, dt / 2));
    const k4 = this.reactorDeriv(add(y, k3, dt));
    y = [
      y[0] + (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
      y[1] + (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
      y[2] + (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    ];

    // Clamp every state every sub-step — keeps the integrator physical & robust.
    this.reactor.Ca = clamp(y[0], 0, Math.max(this.controls.feedConcentration, 5));
    this.reactor.Cb = clamp(y[1], 0, 10);
    this.reactor.T = clamp(y[2], 250, 800);
    this.d.k = PROC.k0 * this.kFactor() * Math.exp(-PROC.EoverR / this.reactor.T);
  }

  private stepColumn(dt: number) {
    const { feedFlow: F, refluxRatio: RR, reboilerDuty: Qreb } = this.controls;
    const { Ca, Cb, T: feedT } = this.reactor;
    const total = Ca + Cb + 1e-9;
    const zB = clamp(Cb / total, 0, 1); // feed fraction of B

    const dutyN = clamp(Qreb / 400, 0, 1.2);
    const sep = 1 - Math.exp(-(RR / 2) - dutyN * 1.5); // 0..~1 separation efficiency
    const xDtarget = clamp(zB + (1 - zB) * sep, 0, 0.999);

    // distillate carries the recovered B at purity xD
    const dist = clamp((sep * F * zB) / Math.max(xDtarget, 0.05), 0, 0.95 * F);
    this.d.distillate = dist;
    this.d.bottoms = Math.max(F - dist, 0);

    const TbotTarget = clamp(feedT + 0.1 * Qreb, feedT, 540);
    const TtopTarget = clamp(feedT - 20 - 25 * xDtarget, 290, feedT);

    // first-order lags toward targets (continuous, frame-rate independent)
    const lag = (cur: number, tgt: number, tau: number) => cur + (tgt - cur) * (1 - Math.exp(-dt / tau));
    this.column.bottomTemp = lag(this.column.bottomTemp, TbotTarget, 2.0);
    this.column.topTemp = lag(this.column.topTemp, TtopTarget, 2.0);
    this.column.purity = lag(this.column.purity, xDtarget, 1.5);
  }

  private stepTanks(dt: number) {
    const q = this.controls.feedFlow;
    // T-101 feed tank: level controller refills toward 60 %
    const makeup = clamp(q + 40 * (60 - this.levels["T-101"]), 0, 320);
    this.d.feedMakeup = makeup;
    this.levels["T-101"] = clamp(this.levels["T-101"] + ((makeup - q) / 5000) * 100 * dt, 0, 100);

    // D-101 product tank: draw controller holds 50 %, inflow = distillate
    const draw101 = clamp(this.d.distillate + 30 * (this.levels["D-101"] - 50), 0, 500);
    this.d.draw101 = draw101;
    this.levels["D-101"] = clamp(
      this.levels["D-101"] + ((this.d.distillate - draw101) / 3000) * 100 * dt,
      0,
      100,
    );

    // D-102 bottoms tank
    const draw102 = clamp(this.d.bottoms + 30 * (this.levels["D-102"] - 50), 0, 500);
    this.d.draw102 = draw102;
    this.levels["D-102"] = clamp(
      this.levels["D-102"] + ((this.d.bottoms - draw102) / 3000) * 100 * dt,
      0,
      100,
    );
  }

  /** Advance the whole plant by `simMinutes` of process time. */
  step(simMinutes: number) {
    if (simMinutes <= 0) return;
    const innerDt = 0.02; // min — well inside RK4 stability for this system
    const n = Math.min(Math.max(Math.ceil(simMinutes / innerDt), 1), 400);
    const dt = simMinutes / n;
    for (let i = 0; i < n; i++) {
      this.stepReactor(dt);
      this.stepColumn(dt);
      this.stepTanks(dt);
    }
    // jacket duty (kW): UA_eff·(T−Tc) in J/min → kW
    this.d.jacketDutyKW = (this.uaEff() * (this.reactor.T - this.controls.coolantTemp)) / 60_000;
    this.time += simMinutes;
  }

  private reactorPressure(T: number) {
    // Reactor pressure = system/headspace setpoint + thermal (vapour-pressure) rise.
    return Math.max(1, (this.controls.systemPressure ?? 2.5) + 0.025 * (T - 320));
  }
  private columnPressure(Tbot: number) {
    return Math.max(1, 1.4 + 0.012 * (Tbot - 350));
  }

  /** Compare a value to a limit spec and return severity + the breached limit. */
  private severityFor(value: number, spec: LimitSpec): { sev: AlarmSeverity; limit: number; hiLo: "HIGH" | "LOW" | null } {
    if (spec.critHi !== undefined && value >= spec.critHi) return { sev: "critical", limit: spec.critHi, hiLo: "HIGH" };
    if (spec.critLo !== undefined && value <= spec.critLo) return { sev: "critical", limit: spec.critLo, hiLo: "LOW" };
    if (spec.warnHi !== undefined && value >= spec.warnHi) return { sev: "warning", limit: spec.warnHi, hiLo: "HIGH" };
    if (spec.warnLo !== undefined && value <= spec.warnLo) return { sev: "warning", limit: spec.warnLo, hiLo: "LOW" };
    return { sev: "normal", limit: 0, hiLo: null };
  }

  private evaluateAlarms(equipment: Record<EquipmentId, EquipmentState>) {
    const seenKeys = new Set<string>();
    (Object.keys(LIMITS) as EquipmentId[]).forEach((eqId) => {
      const specs = LIMITS[eqId]!;
      (Object.keys(specs) as Array<"Temperature" | "Pressure" | "Level">).forEach((variable) => {
        const spec = specs[variable]!;
        const eq = equipment[eqId];
        const value =
          variable === "Temperature" ? eq.temperature : variable === "Pressure" ? eq.pressure : eq.level;
        const { sev, limit, hiLo } = this.severityFor(value, spec);
        if (sev === "normal") return;
        const key = `${eqId}:${variable}`;
        seenKeys.add(key);
        const existing = this.activeAlarms.get(key);
        const message = `${EQUIPMENT_META[eqId].name} ${variable.toLowerCase()} ${hiLo} — ${value.toFixed(
          1,
        )} ${spec.unit} ${hiLo === "HIGH" ? "≥" : "≤"} ${limit} ${spec.unit}`;
        if (existing) {
          existing.severity = sev;
          existing.value = value;
          existing.limit = limit;
          existing.message = message;
        } else {
          this.activeAlarms.set(key, {
            id: key,
            equipmentId: eqId,
            variable,
            severity: sev,
            message,
            value,
            limit,
            timestamp: this.time,
          });
        }
      });
    });
    // clear alarms that have returned to normal
    for (const key of Array.from(this.activeAlarms.keys())) {
      if (!seenKeys.has(key)) this.activeAlarms.delete(key);
    }
  }

  /** Build the immutable snapshot consumed by the UI. */
  snapshot(): SimSnapshot {
    const { feedFlow: q, feedTemp, feedConcentration: Caf, coolantTemp } = this.controls;
    const { Ca, Cb, T } = this.reactor;
    const conversion = clamp((Caf - Ca) / Math.max(Caf, 1e-6), 0, 1);

    const equipment: Record<EquipmentId, EquipmentState> = {
      "T-101": {
        id: "T-101",
        name: EQUIPMENT_META["T-101"].name,
        kind: "tank",
        temperature: feedTemp,
        pressure: 1.05,
        level: this.levels["T-101"],
        flowIn: this.d.feedMakeup,
        flowOut: q,
        status: "normal",
      },
      "P-101": {
        id: "P-101",
        name: EQUIPMENT_META["P-101"].name,
        kind: "pump",
        temperature: feedTemp,
        pressure: 1.0 + 0.03 * q,
        level: 100,
        flowIn: q,
        flowOut: q,
        status: "normal",
      },
      "R-101": {
        id: "R-101",
        name: EQUIPMENT_META["R-101"].name,
        kind: "reactor",
        temperature: T,
        pressure: this.reactorPressure(T),
        level: 85,
        flowIn: q,
        flowOut: q,
        status: "normal",
        Ca,
        Cb,
        conversion,
        coolantTemp,
        rateConstant: this.d.k,
        duty: this.d.jacketDutyKW,
      },
      "C-101": {
        id: "C-101",
        name: EQUIPMENT_META["C-101"].name,
        kind: "column",
        temperature: this.column.bottomTemp,
        pressure: this.columnPressure(this.column.bottomTemp),
        level: 60,
        flowIn: q,
        flowOut: this.d.distillate + this.d.bottoms,
        status: "normal",
        purity: this.column.purity,
        topTemp: this.column.topTemp,
        bottomTemp: this.column.bottomTemp,
        distillateFlow: this.d.distillate,
        bottomsFlow: this.d.bottoms,
        duty: this.controls.reboilerDuty,
      },
      "D-101": {
        id: "D-101",
        name: EQUIPMENT_META["D-101"].name,
        kind: "tank",
        temperature: this.column.topTemp,
        pressure: 1.05,
        level: this.levels["D-101"],
        flowIn: this.d.distillate,
        flowOut: this.d.draw101,
        status: "normal",
      },
      "D-102": {
        id: "D-102",
        name: EQUIPMENT_META["D-102"].name,
        kind: "tank",
        temperature: this.column.bottomTemp,
        pressure: 1.05,
        level: this.levels["D-102"],
        flowIn: this.d.bottoms,
        flowOut: this.d.draw102,
        status: "normal",
      },
    };

    this.evaluateAlarms(equipment);

    // attach worst severity to each unit
    const alarms = Array.from(this.activeAlarms.values());
    for (const alarm of alarms) {
      const eq = equipment[alarm.equipmentId];
      if (SEVERITY_RANK[alarm.severity] > SEVERITY_RANK[eq.status]) eq.status = alarm.severity;
    }
    alarms.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || a.timestamp - b.timestamp);

    const warnCount = alarms.filter((a) => a.severity === "warning").length;
    const critCount = alarms.filter((a) => a.severity === "critical").length;
    const kpis: Kpis = {
      production: q * Cb * 3.6, // kg/h of B  (q·Cb mol/min · 60 min/h · MW g/mol / 1000)
      conversion,
      purity: this.column.purity,
      energyUse: Math.abs(this.d.jacketDutyKW) + this.controls.reboilerDuty * 1.9,
      safetyScore: clamp(100 - warnCount * 10 - critCount * 30, 0, 100),
    };

    return {
      time: this.time,
      wallClock: Date.now(),
      equipment,
      alarms,
      kpis,
    };
  }
}

export function createSimulator(controls?: ControlInputs) {
  return new PlantSimulator(controls);
}
