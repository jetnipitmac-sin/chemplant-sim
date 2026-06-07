/**
 * Educational simulator state (Zustand) — DCS/SCADA edition.
 *
 *   • language / activeProcessId / params / selectedUnitId   (control)
 *   • viewMode (3d ↔ P&ID)                                    (scene)
 *   • outputs / alarms                                        (live, written by the sampler)
 *   • history                                                 (rolling trend buffer)
 *   • scenario                                                (guided "mission" run-state)
 *
 * Outputs + alarms are evaluated once per tick by hooks/useOutputSampler and stored
 * here so every panel (KPIs, trend graphs, alarm banner, scenario) reads one source.
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import {
  defaultParams,
  getLoop,
  getLoops,
  PROCESS_ORDER,
  PROCESSES,
  type EconomicsResult,
  type ProcessAlarm,
  type ProcessId,
  type SustainabilityResult,
} from "@/lib/processes";
import i18n, { type Language } from "@/lib/i18n/config";

export type RightTab = "simulate" | "alarms" | "learn";
export type ViewMode = "3d" | "pid";

export interface ScenarioRun {
  id: string;
  status: "running" | "success" | "failed";
  remainingSec: number;
  holdSec: number;
  safeElapsed: number;
  score?: number;
}

/** Live PID controller state for one control loop. */
export interface Controller {
  auto: boolean;
  sp: number;
  kp: number;
  ki: number;
  kd: number;
  integral: number; // accumulated ∫error·dt (with anti-windup)
  lastPV: number; // previous measurement (for derivative-on-measurement)
}

/** A recorded mission result (persisted to localStorage). */
export interface ScoreEntry {
  id: string;
  scenarioId: string;
  processId: ProcessId;
  status: "success" | "failed";
  score: number;
  timeSec: number;
  at: number;
}

const LB_KEY = "prosim-leaderboard";
const persistLeaderboard = (lb: ScoreEntry[]) => {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LB_KEY, JSON.stringify(lb));
    } catch {
      /* ignore */
    }
  }
};
const loadLeaderboard = (): ScoreEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LB_KEY) || "[]");
  } catch {
    return [];
  }
};

/** One entry in the DCS alarm journal. */
export interface AlarmEvent {
  uid: string;
  id: string;
  kind: "param" | "output";
  severity: "warning" | "critical";
  raisedAt: number; // Date.now() ms
  clearedAt?: number;
  acked: boolean;
}

interface SimState {
  language: Language;
  activeProcessId: ProcessId;
  params: Record<ProcessId, Record<string, number>>;
  rightTab: RightTab;
  selectedUnitId: string;
  viewMode: ViewMode;
  history: Array<Record<string, number>>;
  /** Frozen snapshot of the trend buffer for run-vs-run comparison (overlay). */
  baseline: Array<Record<string, number>> | null;
  outputs: Record<string, number>;
  alarms: ProcessAlarm[];
  alarmLog: AlarmEvent[];
  scenario: ScenarioRun | null;
  economics: EconomicsResult | null;
  sustainability: SustainabilityResult | null;
  leaderboard: ScoreEntry[];
  xray: boolean;
  /** Per-loop PID controller state (keyed by loop id, global across processes). */
  controllers: Record<string, Controller>;
  /** DVR transport. */
  running: boolean;
  speed: number;

  setLanguage: (l: Language) => void;
  setActiveProcess: (id: ProcessId) => void;
  setParam: (processId: ProcessId, paramId: string, value: number) => void;
  resetParams: (processId: ProcessId) => void;
  setRightTab: (t: RightTab) => void;
  setSelectedUnit: (unitId: string) => void;
  setViewMode: (m: ViewMode) => void;
  pushHistory: (values: Record<string, number>, dtSec?: number) => void;
  /** Written by the sampler each tick. */
  setLive: (outputs: Record<string, number>, alarms: ProcessAlarm[]) => void;
  startScenario: (scenarioId: string) => void;
  abortScenario: () => void;
  tickScenario: (dtSec: number, critical: boolean) => void;
  acknowledgeAlarm: (id: string) => void;
  acknowledgeAll: () => void;
  setEconomics: (e: EconomicsResult) => void;
  setSustainability: (s: SustainabilityResult) => void;
  hydrateLeaderboard: () => void;
  toggleXray: () => void;
  setRunning: (r: boolean) => void;
  toggleRunning: () => void;
  setSpeed: (s: number) => void;
  clearHistory: () => void;
  snapshotBaseline: () => void;
  clearBaseline: () => void;
  /** PID control loops. */
  setControllerAuto: (loopId: string, auto: boolean) => void;
  setControllerSp: (loopId: string, sp: number) => void;
  setControllerGains: (loopId: string, gains: Partial<Pick<Controller, "kp" | "ki" | "kd">>) => void;
  /** Internal: written by the sampler's PID step each tick. */
  tickController: (loopId: string, integral: number, lastPV: number) => void;
}

const buildInitialParams = () =>
  Object.fromEntries(PROCESS_ORDER.map((id) => [id, defaultParams(PROCESSES[id])])) as Record<
    ProcessId,
    Record<string, number>
  >;

const buildInitialControllers = (): Record<string, Controller> =>
  Object.fromEntries(
    getLoops().map(({ loop }) => [
      loop.id,
      { auto: false, sp: loop.sp, kp: loop.kp, ki: loop.ki, kd: loop.kd, integral: 0, lastPV: loop.sp },
    ]),
  );

export const useSimStore = create<SimState>()(
  subscribeWithSelector((set, get) => ({
    language: "en",
    activeProcessId: "oil",
    params: buildInitialParams(),
    rightTab: "simulate",
    selectedUnitId: PROCESSES.oil.units[0].id,
    viewMode: "3d",
    history: [],
    baseline: null,
    outputs: {},
    alarms: [],
    alarmLog: [],
    scenario: null,
    economics: null,
    sustainability: null,
    leaderboard: [],
    xray: false,
    controllers: buildInitialControllers(),
    running: true,
    speed: 1,

    setLanguage: (language) => {
      void i18n.changeLanguage(language);
      if (typeof window !== "undefined") window.localStorage.setItem("lang", language);
      set({ language });
    },
    setActiveProcess: (activeProcessId) =>
      set({
        activeProcessId,
        selectedUnitId: PROCESSES[activeProcessId].units[0].id,
        history: [],
        baseline: null,
        outputs: {},
        alarms: [],
        alarmLog: [],
        scenario: null,
        economics: null,
        sustainability: null,
      }),
    setParam: (processId, paramId, value) =>
      set((s) => ({
        params: { ...s.params, [processId]: { ...s.params[processId], [paramId]: value } },
      })),
    resetParams: (processId) =>
      set((s) => ({ params: { ...s.params, [processId]: defaultParams(PROCESSES[processId]) } })),
    setRightTab: (rightTab) => set({ rightTab }),
    setSelectedUnit: (selectedUnitId) => set({ selectedUnitId }),
    setViewMode: (viewMode) => set({ viewMode }),
    pushHistory: (values, dtSec = 0.4) =>
      set((s) => {
        const last = s.history[s.history.length - 1];
        const t = last ? (last.t as number) + dtSec : 0;
        const next = [...s.history, { t, ...values }];
        if (next.length > 150) next.splice(0, next.length - 150);
        return { history: next };
      }),
    setLive: (outputs, alarms) =>
      set((s) => {
        const now = Date.now();
        const activeIds = new Set(alarms.map((a) => a.id));
        // close out alarms that returned to normal
        let log = s.alarmLog.map((e) => (e.clearedAt == null && !activeIds.has(e.id) ? { ...e, clearedAt: now } : e));
        const openIds = new Set(log.filter((e) => e.clearedAt == null).map((e) => e.id));
        for (const a of alarms) {
          if (!openIds.has(a.id)) {
            // new alarm raised
            log = [{ uid: `${a.id}@${now}`, id: a.id, kind: a.kind, severity: a.severity, raisedAt: now, acked: false }, ...log];
          } else if (a.severity === "critical") {
            // escalation (warning → critical) re-arms the acknowledgement
            log = log.map((e) =>
              e.clearedAt == null && e.id === a.id && e.severity !== "critical" ? { ...e, severity: "critical", acked: false } : e,
            );
          }
        }
        if (log.length > 60) log = log.slice(0, 60);
        return { outputs, alarms, alarmLog: log };
      }),

    startScenario: (scenarioId) => {
      const pid = get().activeProcessId;
      const sc = PROCESSES[pid].scenarios.find((s) => s.id === scenarioId);
      if (!sc) return;
      set((s) => ({
        params: { ...s.params, [pid]: { ...s.params[pid], ...sc.setup } },
        history: [],
        scenario: { id: sc.id, status: "running", remainingSec: sc.durationSec, holdSec: sc.holdSec, safeElapsed: 0 },
      }));
    },
    abortScenario: () => set({ scenario: null }),
    tickScenario: (dtSec, critical) =>
      set((s) => {
        const sc = s.scenario;
        if (!sc || sc.status !== "running") return {};
        const remainingSec = Math.max(0, sc.remainingSec - dtSec);
        const safeElapsed = critical ? 0 : sc.safeElapsed + dtSec;
        let status: ScenarioRun["status"] = "running";
        if (safeElapsed >= sc.holdSec) status = "success";
        else if (remainingSec <= 0) status = "failed";
        if (status === "running") return { scenario: { ...sc, remainingSec, safeElapsed } };

        // mission completed → score it + record on the leaderboard
        const def = PROCESSES[s.activeProcessId].scenarios.find((x) => x.id === sc.id);
        const dur = def?.durationSec ?? 60;
        const score = status === "success" ? Math.round(500 + (remainingSec / dur) * 500) : 0; // faster = higher
        const entry: ScoreEntry = {
          id: `${sc.id}@${Date.now()}`,
          scenarioId: sc.id,
          processId: s.activeProcessId,
          status,
          score,
          timeSec: Math.round(dur - remainingSec),
          at: Date.now(),
        };
        const leaderboard = [entry, ...s.leaderboard].slice(0, 50);
        persistLeaderboard(leaderboard);
        return { scenario: { ...sc, remainingSec, safeElapsed, status, score }, leaderboard };
      }),
    acknowledgeAlarm: (id) =>
      set((s) => ({ alarmLog: s.alarmLog.map((e) => (e.clearedAt == null && e.id === id ? { ...e, acked: true } : e)) })),
    acknowledgeAll: () =>
      set((s) => ({ alarmLog: s.alarmLog.map((e) => (e.clearedAt == null ? { ...e, acked: true } : e)) })),
    setEconomics: (economics) => set({ economics }),
    setSustainability: (sustainability) => set({ sustainability }),
    hydrateLeaderboard: () => set({ leaderboard: loadLeaderboard() }),
    toggleXray: () => set((s) => ({ xray: !s.xray })),
    setRunning: (running) => set({ running }),
    toggleRunning: () => set((s) => ({ running: !s.running })),
    setSpeed: (speed) => set({ speed }),
    clearHistory: () => set({ history: [] }),
    snapshotBaseline: () => set((s) => ({ baseline: s.history.length ? s.history.map((r) => ({ ...r })) : null })),
    clearBaseline: () => set({ baseline: null }),

    setControllerAuto: (loopId, auto) =>
      set((s) => {
        const c = s.controllers[loopId];
        if (!c) return {};
        let integral = c.integral;
        let lastPV = c.lastPV;
        const entry = getLoop(loopId);
        if (entry) {
          const { loop, processId } = entry;
          const pv = s.outputs[loop.pv];
          if (pv !== undefined) lastPV = pv;
          // bumpless transfer: on entering Auto, preload the integral so the MV
          // doesn't jump from its current manual value.
          if (auto && !c.auto && pv !== undefined && c.ki !== 0) {
            const mvDef = PROCESSES[processId].params.find((p) => p.id === loop.mv);
            const bias = mvDef?.default ?? 0;
            const curMV = s.params[processId][loop.mv] ?? bias;
            const err = (c.sp - pv) * (loop.reverse ? -1 : 1);
            integral = (curMV - bias - c.kp * err) / c.ki;
          }
        }
        return { controllers: { ...s.controllers, [loopId]: { ...c, auto, integral, lastPV } } };
      }),
    setControllerSp: (loopId, sp) =>
      set((s) => (s.controllers[loopId] ? { controllers: { ...s.controllers, [loopId]: { ...s.controllers[loopId], sp } } } : {})),
    setControllerGains: (loopId, gains) =>
      set((s) => (s.controllers[loopId] ? { controllers: { ...s.controllers, [loopId]: { ...s.controllers[loopId], ...gains } } } : {})),
    tickController: (loopId, integral, lastPV) =>
      set((s) => (s.controllers[loopId] ? { controllers: { ...s.controllers, [loopId]: { ...s.controllers[loopId], integral, lastPV } } } : {})),
  })),
);

/** Count of active, unacknowledged alarms (for the Alarms tab badge). */
export const useUnackedCount = () =>
  useSimStore((s) => s.alarmLog.filter((e) => e.clearedAt == null && !e.acked).length);

// ---- convenience selectors ----
export const useActiveProcessId = () => useSimStore((s) => s.activeProcessId);
export const useActiveConfig = () => PROCESSES[useSimStore((s) => s.activeProcessId)];
export const useActiveParams = () => useSimStore((s) => s.params[s.activeProcessId]);
