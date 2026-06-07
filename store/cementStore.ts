/**
 * Cement telemetry store (mocked DCS tags for the Cement-Manufacturing 3D scene).
 *
 * One slice of "live" parameters per piece of equipment plus a single `hoveredId`
 * driving the HTML hover-tooltip overlay. Values are mocked but coupled to the
 * real cement sliders (store/simStore → params.cement) and the model outputs via
 * `tick()`, so adjusting feed / kiln speed / fuel / draft animates every readout.
 */
import { create } from "zustand";

export type CementEquipmentId =
  | "crusher"
  | "rawMill"
  | "preheater"
  | "kiln"
  | "cooler"
  | "baghouse"
  | "cementMill";

export interface CementTelemetry {
  crusher: { feed: number; fineness: number };
  rawMill: { feed: number; fineness: number };
  preheater: { topGasTemp: number; calcination: number };
  kiln: { burnTemp: number; torque: number; c3s: number };
  cooler: { clinkerTemp: number; recupEff: number };
  baghouse: { dust: number; draft: number };
  cementMill: { blaine: number; output: number };
}

/** Live cement-slider + model-output snapshot fed into `tick`. */
export interface CementSnapshot {
  feed: number; // t/h  — rawFeedRate
  kilnSpeed: number; // rpm — kilnSpeed
  fuel: number; // t/h  — burnerFuelRate
  fan: number; // %    — idFanSpeed
  burnTemp: number; // °C  — model output
  c3s: number; // %    — model output
  production: number; // t/h — model output (clinker)
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

const NOMINAL: CementTelemetry = {
  crusher: { feed: 250, fineness: 12 },
  rawMill: { feed: 250, fineness: 13 },
  preheater: { topGasTemp: 330, calcination: 92 },
  kiln: { burnTemp: 1450, torque: 48, c3s: 60 },
  cooler: { clinkerTemp: 120, recupEff: 72 },
  baghouse: { dust: 15, draft: -6.2 },
  cementMill: { blaine: 3500, output: 168 },
};

interface CementStore extends CementTelemetry {
  hoveredId: CementEquipmentId | null;
  setHovered: (id: CementEquipmentId) => void;
  clearHovered: (id?: CementEquipmentId) => void;
  tick: (elapsed: number, sim: CementSnapshot) => void;
}

export const useCementStore = create<CementStore>((set) => ({
  ...NOMINAL,
  hoveredId: null,
  setHovered: (id) => set({ hoveredId: id }),
  clearHovered: (id) => set((s) => (id === undefined || s.hoveredId === id ? { hoveredId: null } : {})),
  tick: (t, sim) => {
    const wob = (amp: number, freq: number, ph: number) => amp * Math.sin(t * freq + ph);
    const { feed, kilnSpeed, fuel, fan, burnTemp, c3s, production } = sim;
    const fineness = clamp(12 + (feed - 250) * 0.03, 5, 26);
    set({
      crusher: { feed, fineness: fineness + 0.6 + wob(0.3, 0.7, 0) },
      rawMill: { feed, fineness: fineness + wob(0.3, 0.6, 1) },
      preheater: {
        topGasTemp: clamp(330 + (fan - 85) * 1.6 + (burnTemp - 1450) * 0.05, 270, 430) + wob(2, 0.5, 2),
        calcination: clamp(92 + (burnTemp - 1450) * 0.02 - (feed - 250) * 0.03, 60, 99.5) + wob(0.3, 0.4, 0),
      },
      kiln: {
        burnTemp,
        torque: clamp(48 + (feed - 250) * 0.16 + (burnTemp - 1450) * 0.02 + (3.5 - kilnSpeed) * 6, 18, 98) + wob(1.2, 0.9, 1),
        c3s,
      },
      cooler: {
        clinkerTemp: clamp(120 + (feed - 250) * 0.25 - (fan - 85) * 0.6 + Math.max(0, burnTemp - 1500) * 0.1, 70, 280) + wob(2.5, 0.6, 3),
        recupEff: clamp(72 + (fan - 85) * 0.22 - (feed - 250) * 0.05, 40, 86) + wob(0.5, 0.5, 1),
      },
      baghouse: {
        // dust emission spikes when the ID fan / draft is too low to keep the baghouse working
        dust: clamp(15 + Math.max(0, 80 - fan) * 8 + Math.max(0, feed - 275) * 1.5, 5, 650) + wob(3, 1.1, 0),
        draft: -(2 + (fan - 50) * 0.12) + wob(0.15, 0.8, 2),
      },
      cementMill: {
        blaine: clamp(3500 - (feed - 250) * 2.2, 2700, 4300) + wob(12, 0.7, 1),
        output: Math.max(0, production * 1.05) + wob(0.8, 1.0, 0),
      },
    });
  },
}));
