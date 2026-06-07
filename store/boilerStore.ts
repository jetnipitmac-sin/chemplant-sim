/**
 * Boiler scene hover state. The boiler tooltip reads the REAL live data straight
 * from `simStore` (params + model outputs), so this store only needs to track
 * which piece of equipment is hovered.
 */
import { create } from "zustand";

export type BoilerEquipId = "furnace" | "steamDrum" | "superheater" | "turbine" | "feedwater" | "stack";

interface BoilerHoverStore {
  hoveredId: BoilerEquipId | null;
  setHovered: (id: BoilerEquipId) => void;
  /** Clear the tooltip; pass an id to only clear if it is still the active one. */
  clearHovered: (id?: BoilerEquipId) => void;
}

export const useBoilerHover = create<BoilerHoverStore>((set) => ({
  hoveredId: null,
  setHovered: (id) => set({ hoveredId: id }),
  clearHovered: (id) => set((s) => (id === undefined || s.hoveredId === id ? { hoveredId: null } : {})),
}));
