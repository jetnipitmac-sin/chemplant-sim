/**
 * Gas Separation Plant scene hover state. The GSP tooltip reads the REAL live
 * data straight from `simStore` (params + model outputs), so this store only
 * needs to track which piece of equipment is currently hovered.
 */
import { create } from "zustand";

export type GspEquipId =
  | "slugCatcher"
  | "amineTower"
  | "dehydration"
  | "coldBox"
  | "demethanizer"
  | "deethanizer"
  | "depropanizer"
  | "debutanizer";

interface GspHoverStore {
  hoveredId: GspEquipId | null;
  setHovered: (id: GspEquipId) => void;
  /** Clear the tooltip; pass an id to only clear if it is still the active one. */
  clearHovered: (id?: GspEquipId) => void;
}

export const useGspHover = create<GspHoverStore>((set) => ({
  hoveredId: null,
  setHovered: (id) => set({ hoveredId: id }),
  clearHovered: (id) => set((s) => (id === undefined || s.hoveredId === id ? { hoveredId: null } : {})),
}));
