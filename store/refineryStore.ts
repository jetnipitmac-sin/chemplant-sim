/**
 * Refinery telemetry store (mocked DCS tags for the Oil-Refining 3D scene).
 *
 * Holds one slice of "live" parameters per piece of equipment plus the 8
 * textbook distillation fractions, and a single `hoveredId` that drives the
 * HTML hover-tooltip overlay. The values are mocked but coupled to the real
 * oil sliders (`store/simStore` → params.oil) via `tick()`, so adjusting the
 * furnace, feed, pressure or reflux animates the readouts and the cut yields.
 */
import { create } from "zustand";

export type EquipmentId =
  | "tankFarm"
  | "crudePumps"
  | "desalter"
  | "heatExchangers"
  | "firedHeater"
  | "airCoolers"
  | "flareStack"
  | "column";

export interface ProductCut {
  key: string;
  /** Display name, e.g. "Kerosene / Paraffin". */
  name: string;
  /** Carbon-number range, e.g. "C11–C16". */
  carbon: string;
  /** Boiling-point range, e.g. "~200 °C". */
  bp: string;
  /** Swatch / draw-pipe colour. */
  color: string;
  /** Live yield (vol %). */
  pct: number;
}

/** Per-equipment mocked telemetry. */
export interface RefineryTelemetry {
  tankFarm: { inventory: number; api: number };
  crudePumps: { flow: number; discharge: number };
  desalter: { waterInjection: number; salt: number };
  heatExchangers: { duty: number; inletT: number; outletT: number };
  firedHeater: { fuelGas: number; coilOutletT: number };
  airCoolers: { fanRpm: number; airDeltaT: number };
  flareStack: { headerP: number; purge: number };
  column: { topPressure: number; refluxRatio: number };
}

/** Live oil-slider snapshot fed into `tick`. */
export interface SimSnapshot {
  coilT: number; // °C   — oilFurnaceTemp (coil outlet)
  feed: number; // m³/h  — oilFeedRate
  colP: number; // kPa   — oilColumnPressure
  reflux: number; // –   — oilRefluxRatio
  pumpSpeed: number; // %    — crudePumpSpeed
  desalterWater: number; // % — desalterWater
  airRpm: number; // rpm   — airCoolerRpm
  flareValve: number; // %  — flareValve
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/**
 * The 8 textbook fractions, lightest (top of the column) → heaviest (bottom),
 * with carbon-chain ranges and boiling points for the educational tooltip.
 */
export const CUT_DEFS: Omit<ProductCut, "pct">[] = [
  { key: "gas", name: "Refinery Gas", carbon: "C1–C4", bp: "< 25 °C", color: "#a3e635" },
  { key: "gasoline", name: "Gasoline / Petrol", carbon: "C5–C10", bp: "40–200 °C", color: "#facc15" },
  { key: "naphtha", name: "Naphtha", carbon: "C8–C12", bp: "~150 °C", color: "#fbbf24" },
  { key: "kerosene", name: "Kerosene / Paraffin", carbon: "C11–C16", bp: "~200 °C", color: "#fb923c" },
  { key: "diesel", name: "Diesel / Gas Oil", carbon: "C14–C20", bp: "~300 °C", color: "#f97316" },
  { key: "lube", name: "Lubricating Oil", carbon: "C20–C50", bp: "~370 °C", color: "#b45309" },
  { key: "fueloil", name: "Fuel Oil", carbon: "C20–C70", bp: "~400 °C", color: "#7c4a23" },
  { key: "residue", name: "Bitumen / Residue", carbon: "> C70", bp: "> 400 °C", color: "#57534e" },
];

/** Nominal crude-assay yields (vol %), summing to 100. */
const BASE_YIELD = [2.5, 22, 11, 12, 19, 10, 13.5, 10];

/**
 * Recompute the 8 yields from the coil-outlet temperature: hotter coil → more
 * cracking → the slate shifts toward the light ends (gas/gasoline) at the
 * expense of the residue; cooler coil does the reverse. Re-normalised to 100 %.
 */
export function computeCuts(coilT: number, opts?: { vaporDeficit?: number; lightPenalty?: number }): ProductCut[] {
  const f = clamp((coilT - 357) / 45, -1, 1); // −1 cold … +1 hot
  const vaporDeficit = clamp(opts?.vaporDeficit ?? 0, 0, 1); // cold / over-fed flash zone → heavy + bitumen
  const lightPenalty = clamp(opts?.lightPenalty ?? 0, 0, 1); // poor overhead condensing → light ends slip
  const n = BASE_YIELD.length;
  const w = BASE_YIELD.map((b, i) => {
    const lightness = 1 - (2 * i) / (n - 1); // +1 (lightest) … −1 (heaviest)
    return Math.max(0.2, b * (1 + 0.5 * f * lightness));
  });
  // vaporization deficit: pull mass out of the light + mid cuts into the residue (last index)
  if (vaporDeficit > 0) {
    let moved = 0;
    for (let i = 0; i < n - 1; i++) {
      const take = w[i] * 0.6 * vaporDeficit;
      w[i] -= take;
      moved += take;
    }
    w[n - 1] += moved;
  }
  // overhead-condensation penalty: gas + gasoline (0,1) recovered yield drops → slips into naphtha/kerosene (2,3)
  if (lightPenalty > 0) {
    for (const i of [0, 1]) {
      const take = w[i] * 0.5 * lightPenalty;
      w[i] -= take;
      w[i + 2] += take;
    }
  }
  const sum = w.reduce((a, b) => a + b, 0);
  return CUT_DEFS.map((c, i) => ({ ...c, pct: (w[i] / sum) * 100 }));
}

const NOMINAL: RefineryTelemetry = {
  tankFarm: { inventory: 482000, api: 32.6 },
  crudePumps: { flow: 150, discharge: 18.2 },
  desalter: { waterInjection: 6.5, salt: 0.7 },
  heatExchangers: { duty: 41, inletT: 96, outletT: 232 },
  firedHeater: { fuelGas: 3200, coilOutletT: 357 },
  airCoolers: { fanRpm: 218, airDeltaT: 28 },
  flareStack: { headerP: 0.35, purge: 118 },
  column: { topPressure: 1.4, refluxRatio: 3.2 },
};

interface RefineryStore extends RefineryTelemetry {
  cuts: ProductCut[];
  hoveredId: EquipmentId | null;
  setHovered: (id: EquipmentId) => void;
  /** Clear the tooltip; pass an id to only clear if it is still the active one. */
  clearHovered: (id?: EquipmentId) => void;
  /** Refresh all telemetry + cuts from the live sliders (called ~4 Hz). */
  tick: (elapsed: number, sim: SimSnapshot) => void;
}

export const useRefineryStore = create<RefineryStore>((set) => ({
  ...NOMINAL,
  cuts: computeCuts(NOMINAL.firedHeater.coilOutletT),
  hoveredId: null,
  setHovered: (id) => set({ hoveredId: id }),
  clearHovered: (id) => set((s) => (id === undefined || s.hoveredId === id ? { hoveredId: null } : {})),
  tick: (t, sim) => {
    const wob = (amp: number, freq: number, ph: number) => amp * Math.sin(t * freq + ph);
    const coilT = sim.coilT;
    const hot = (coilT - 357) / 45; // −ve cooler, +ve hotter than nominal
    // mirror the process-model couplings so the tooltips agree with the KPIs
    const effFeed = sim.feed * (sim.pumpSpeed / 80);
    const vaporDeficit = clamp(1 - (coilT - 300) / Math.max(effFeed * 0.38, 1), 0, 1);
    const lightPenalty = clamp(1 - sim.airRpm / 1100, 0, 1);
    set({
      tankFarm: { inventory: 482000 + wob(900, 0.05, 0), api: 32.6 + wob(0.15, 0.07, 1) },
      crudePumps: {
        flow: effFeed + wob(1.4, 1.3, 0),
        discharge: 6 + sim.pumpSpeed * 0.16 + wob(0.15, 1.7, 2),
      },
      desalter: {
        waterInjection: sim.desalterWater,
        salt: clamp(2.4 - sim.desalterWater * 0.34, 0.05, 3) + wob(0.05, 0.9, 1),
      },
      heatExchangers: {
        duty: 41 + hot * 4 + (effFeed - 150) * 0.05 + wob(0.5, 0.8, 3),
        inletT: 96 + wob(1.2, 0.5, 0),
        outletT: 232 + hot * 10 + wob(1.5, 0.6, 2),
      },
      firedHeater: { fuelGas: 3200 * (coilT / 357) * (effFeed / 150) + wob(35, 1.1, 0), coilOutletT: coilT },
      airCoolers: { fanRpm: sim.airRpm, airDeltaT: 8 + (sim.airRpm / 1200) * 22 + hot * 3 + wob(0.8, 0.7, 1) },
      flareStack: {
        headerP: clamp(0.55 - sim.flareValve * 0.003, 0.05, 1) + wob(0.04, 0.4, 0),
        purge: 60 + sim.flareValve * 7 + wob(8, 0.6, 2),
      },
      column: { topPressure: sim.colP / 100 + lightPenalty * 0.6, refluxRatio: sim.reflux },
      cuts: computeCuts(coilT, { vaporDeficit, lightPenalty }),
    });
  },
}));
