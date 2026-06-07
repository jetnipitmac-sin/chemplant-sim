"use client";
/**
 * The process evaluation loop (≈2.5 Hz). Honours the DVR transport (pause / speed)
 * and, per tick: computes outputs, evaluates alarms, computes economics, writes
 * everything to the store, appends graphed outputs + profit to the trend buffer,
 * and advances the scenario clock (all scaled by DVR speed).
 */
import { useEffect } from "react";
import { evaluateAlarms, hasCritical, PROCESSES } from "@/lib/processes";
import { useSimStore } from "@/store/simStore";
import { useSimulationStore } from "@/store/simulationStore";
import { computeCuts } from "@/store/refineryStore";

const DT = 0.4; // seconds (real cadence)
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function useOutputSampler() {
  useEffect(() => {
    const id = setInterval(() => {
      const s = useSimStore.getState();
      if (!s.running) return; // DVR paused → freeze
      const cfg = PROCESSES[s.activeProcessId];
      const params = s.params[s.activeProcessId];

      let outputs: Record<string, number>;
      if (cfg.live) {
        const snap = useSimulationStore.getState().snapshot;
        outputs = {
          cstrReactorT: snap?.equipment["R-101"]?.temperature ?? 0,
          cstrPressure: snap?.equipment["R-101"]?.pressure ?? 0,
          cstrConversion: (snap?.kpis.conversion ?? 0) * 100,
          cstrProduction: snap?.kpis.production ?? 0,
          cstrSafety: snap?.kpis.safetyScore ?? 100,
        };
      } else {
        const target = cfg.model(params); // steady-state target from the algebraic model
        if (cfg.dynamic) {
          // first-order lag: each output eases toward its target with its own τ → trends ramp/settle
          const prev = s.outputs;
          const dt = DT * s.speed;
          const lagged: Record<string, number> = {};
          for (const o of cfg.outputs) {
            const tgt = target[o.id] ?? 0;
            const cur = prev[o.id];
            const a = 1 - Math.exp(-dt / (o.tau ?? 8));
            lagged[o.id] = cur === undefined || !Number.isFinite(cur) ? tgt : cur + (tgt - cur) * a;
          }
          outputs = lagged;
        } else {
          outputs = target;
        }
      }

      const alarms = evaluateAlarms(cfg, params, outputs);
      const eco = cfg.economics(params, outputs);
      const sus = cfg.sustainability(params, outputs);
      s.setLive(outputs, alarms);
      s.setEconomics(eco);
      s.setSustainability(sus);

      const point: Record<string, number> = { profit: eco.profit };
      for (const o of cfg.outputs) if (o.graph) point[o.id] = outputs[o.id] ?? 0;
      // Oil: also stream the 8 fractional-cut yields so the YieldTracker can plot any one live.
      if (cfg.id === "oil") {
        const effFeed = params.oilFeedRate * ((params.crudePumpSpeed ?? 80) / 80);
        const vaporDeficit = clamp(1 - (params.oilFurnaceTemp - 300) / Math.max(effFeed * 0.38, 1), 0, 1);
        const lightPenalty = clamp(1 - (params.airCoolerRpm ?? 1200) / 1100, 0, 1);
        // lag the cut yields too (composition is slow) so the YieldTracker ramps with the rest
        const lastPt = s.history[s.history.length - 1];
        const aCut = 1 - Math.exp(-(DT * s.speed) / 16);
        for (const c of computeCuts(params.oilFurnaceTemp, { vaporDeficit, lightPenalty })) {
          const key = `cut_${c.key}`;
          const prevC = lastPt?.[key];
          point[key] = prevC === undefined ? c.pct : prevC + (c.pct - prevC) * aCut;
        }
      }
      s.pushHistory(point, DT * s.speed);

      // ── PID control loops (Auto): drive PV → SP by adjusting the MV param ──
      for (const loop of cfg.loops ?? []) {
        const c = s.controllers[loop.id];
        if (!c || !c.auto) continue;
        const pv = outputs[loop.pv] ?? 0;
        const mvDef = cfg.params.find((d) => d.id === loop.mv);
        if (!mvDef) continue;
        const dt = DT * s.speed;
        const sign = loop.reverse ? -1 : 1;
        const err = (c.sp - pv) * sign;
        const dpv = ((pv - (c.lastPV ?? pv)) / Math.max(dt, 0.01)) * sign; // derivative on measurement
        let integral = c.integral + err * dt;
        let mv = mvDef.default + c.kp * err + c.ki * integral - c.kd * dpv;
        if (mv > mvDef.max) { mv = mvDef.max; if (err > 0) integral = c.integral; } // anti-windup
        else if (mv < mvDef.min) { mv = mvDef.min; if (err < 0) integral = c.integral; }
        s.setParam(cfg.id, loop.mv, mv);
        s.tickController(loop.id, integral, pv);
      }

      s.tickScenario(DT * s.speed, hasCritical(alarms));
    }, DT * 1000);
    return () => clearInterval(id);
  }, []);
}
