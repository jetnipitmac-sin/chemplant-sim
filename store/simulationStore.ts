/**
 * Global simulation state (Zustand).
 *
 * Single source of truth shared across every tab:
 *   • `controls`  — operator setpoints (UI → worker)
 *   • `snapshot`  — latest engine output (worker → UI)
 *   • `history`   — rolling trend buffer for the real-time charts
 *
 * The worker lifecycle lives in `hooks/useSimulationEngine.ts`, which subscribes
 * to `controls` / `resetNonce` and feeds snapshots back in via `applySnapshot`.
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { DEFAULT_CONTROLS } from "@/lib/simulation/engine";
import type { ControlInputs, EquipmentId, SimSnapshot, TrendPoint } from "@/lib/simulation/types";

export type TabKey = "plant3d" | "pfd" | "unitops" | "safety";

const HISTORY_LIMIT = 240; // ~48 s of trend at the 200 ms cadence

interface SimulationState {
  // data
  snapshot: SimSnapshot | null;
  controls: ControlInputs;
  history: TrendPoint[];
  // ui
  activeTab: TabKey;
  selectedEquipment: EquipmentId | null;
  resetNonce: number;
  // actions
  applySnapshot: (snapshot: SimSnapshot) => void;
  updateControls: (partial: Partial<ControlInputs>) => void;
  toggleRunning: () => void;
  setSpeed: (speed: number) => void;
  requestReset: () => void;
  setActiveTab: (tab: TabKey) => void;
  selectEquipment: (id: EquipmentId | null) => void;
}

export const useSimulationStore = create<SimulationState>()(
  subscribeWithSelector((set, get) => ({
    snapshot: null,
    controls: { ...DEFAULT_CONTROLS },
    history: [],
    activeTab: "plant3d",
    selectedEquipment: null,
    resetNonce: 0,

    applySnapshot: (snapshot) =>
      set((state) => {
        const r = snapshot.equipment["R-101"];
        const point: TrendPoint = {
          t: snapshot.time,
          reactorT: r.temperature,
          reactorP: r.pressure,
          conversion: (r.conversion ?? 0) * 100,
          purity: snapshot.kpis.purity * 100,
          production: snapshot.kpis.production,
          feedFlow: state.controls.feedFlow,
          coolantTemp: state.controls.coolantTemp,
          safetyScore: snapshot.kpis.safetyScore,
        };
        const history = [...state.history, point];
        if (history.length > HISTORY_LIMIT) history.splice(0, history.length - HISTORY_LIMIT);
        return { snapshot, history };
      }),

    updateControls: (partial) => set((state) => ({ controls: { ...state.controls, ...partial } })),
    toggleRunning: () => set((state) => ({ controls: { ...state.controls, running: !state.controls.running } })),
    setSpeed: (speed) => set((state) => ({ controls: { ...state.controls, speed } })),
    requestReset: () =>
      set((state) => ({ history: [], resetNonce: state.resetNonce + 1 })),
    setActiveTab: (activeTab) => set({ activeTab }),
    selectEquipment: (selectedEquipment) => set({ selectedEquipment }),
  })),
);

// stable empty reference to avoid re-render churn when there are no alarms
const EMPTY_ALARMS: SimSnapshot["alarms"] = [];

// Lightweight selector hooks used throughout the UI.
export const useControls = () => useSimulationStore((s) => s.controls);
export const useSnapshot = () => useSimulationStore((s) => s.snapshot);
export const useEquipment = (id: EquipmentId) =>
  useSimulationStore((s) => s.snapshot?.equipment[id] ?? null);
export const useAlarms = () => useSimulationStore((s) => s.snapshot?.alarms ?? EMPTY_ALARMS);
export const useKpis = () => useSimulationStore((s) => s.snapshot?.kpis ?? null);
