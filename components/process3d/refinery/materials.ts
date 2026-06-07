/** Moody industrial material presets (spread into <meshStandardMaterial {...} />).
 *  Tuned to read well against the Tailwind base #080b11. */
export const STEEL_LT = { color: "#9aa7b4", metalness: 0.85, roughness: 0.38 } as const;
export const STEEL_MD = { color: "#69757f", metalness: 0.8, roughness: 0.46 } as const;
export const STEEL_DK = { color: "#39434f", metalness: 0.7, roughness: 0.55 } as const;
export const CONCRETE = { color: "#23282f", metalness: 0.1, roughness: 0.96 } as const;
export const CONCRETE_LT = { color: "#363c45", metalness: 0.1, roughness: 0.92 } as const;
export const CABLE = { color: "#13171c", metalness: 0.25, roughness: 0.9 } as const;
export const TANK = { color: "#3a444f", metalness: 0.55, roughness: 0.5 } as const;
export const PAINT_BLUE = { color: "#2f6f9e", metalness: 0.4, roughness: 0.5 } as const;

/** Pipe livery: silver, blue, yellow, grey, oxide-red. */
export const PIPE_COLORS = ["#9aa7b4", "#2f6f9e", "#d9a441", "#6b7785", "#9e4b3a"] as const;
