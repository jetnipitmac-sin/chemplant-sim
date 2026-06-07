"use client";
/**
 * Shared building blocks for the 3D plant: PBR material presets, a status→colour
 * mapper, the live "unit visual" hook, a reusable emissive-pulse driver (for
 * alarm blinking + thermal glow), and the floating HTML nameplate/selector tag.
 */
import { useRef, type RefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEquipment, useSimulationStore } from "@/store/simulationStore";
import type { AlarmSeverity, EquipmentId } from "@/lib/simulation/types";

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

// PBR presets giving a believable painted-steel / stainless look.
export const STEEL = { color: "#aeb9c6", metalness: 0.9, roughness: 0.32 } as const;
export const STEEL_DARK = { color: "#69788a", metalness: 0.85, roughness: 0.45 } as const;
export const PAINT_BLUE = { color: "#2f6f9e", metalness: 0.35, roughness: 0.55 } as const;
export const PAINT_RUST = { color: "#7c4a2d", metalness: 0.3, roughness: 0.7 } as const;
export const COPPER = { color: "#b5734a", metalness: 0.95, roughness: 0.3 } as const;

export function statusColor(s: AlarmSeverity): string {
  return s === "critical" ? "#ef4444" : s === "warning" ? "#f59e0b" : "#34d399";
}

/** Live, render-time visual state for one unit (recomputed on each snapshot). */
export function useUnitVisual(id: EquipmentId) {
  const eq = useEquipment(id);
  const selected = useSimulationStore((s) => s.selectedEquipment === id);
  const status: AlarmSeverity = eq?.status ?? "normal";
  const temperature = eq?.temperature ?? 300;
  const thermal = clamp((temperature - 300) / 160, 0, 1); // 0 cool → 1 hot
  return {
    eq,
    status,
    selected,
    temperature,
    thermal,
    isWarn: status === "warning",
    isCrit: status === "critical",
  };
}

const RED = new THREE.Color("#ef4444");
const AMBER = new THREE.Color("#f59e0b");

/**
 * Drives a referenced MeshStandardMaterial's emissive each frame:
 *  • critical → fast red blink
 *  • warning  → slow amber pulse
 *  • normal   → steady thermal glow (cool→hot) eased toward `baseColor`
 */
export function EmissivePulse({
  material,
  status,
  thermal,
}: {
  material: RefObject<THREE.MeshStandardMaterial>;
  status: AlarmSeverity;
  thermal: number;
}) {
  const thermalColor = useRef(new THREE.Color());
  useFrame(({ clock }) => {
    const m = material.current;
    if (!m) return;
    const t = clock.elapsedTime;
    if (status === "critical") {
      m.emissive.lerp(RED, 0.4);
      m.emissiveIntensity = 0.6 + 0.9 * (0.5 + 0.5 * Math.sin(t * 9));
    } else if (status === "warning") {
      m.emissive.lerp(AMBER, 0.3);
      m.emissiveIntensity = 0.35 + 0.35 * (0.5 + 0.5 * Math.sin(t * 3.5));
    } else {
      // Realistic: near-neutral when cool, a growing orange→red glow only as the
      // unit approaches its trip temperature (thermal ≈ 0.41 → ~365 K).
      const heat = Math.max(0, Math.min((thermal - 0.41) / 0.59, 1));
      thermalColor.current.setHSL(0.08 - 0.08 * heat, 0.9, 0.5);
      m.emissive.lerp(thermalColor.current, 0.1);
      m.emissiveIntensity += (0.02 + 0.9 * heat - m.emissiveIntensity) * 0.1;
    }
  });
  return null;
}

/** Floating, always-readable nameplate that doubles as the click target. */
export function UnitTag({
  id,
  position,
  readout,
}: {
  id: EquipmentId;
  position: [number, number, number];
  readout?: string;
}) {
  const eq = useEquipment(id);
  const status: AlarmSeverity = eq?.status ?? "normal";
  const select = useSimulationStore((s) => s.selectEquipment);
  const selected = useSimulationStore((s) => s.selectedEquipment === id);
  const color = statusColor(status);
  return (
    <Html position={position} center zIndexRange={[20, 0]} pointerEvents="auto" prepend>
      <button
        onClick={(e) => {
          e.stopPropagation();
          select(id);
        }}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-medium backdrop-blur-md transition ${
          selected
            ? "border-brand bg-brand/20 text-ink shadow-glow"
            : "border-edge bg-panel/85 text-ink/90 hover:border-brand/60"
        }`}
        style={{ transform: "translateY(-2px)" }}
      >
        <span
          className={`led ${status === "critical" ? "animate-blink" : ""}`}
          style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        />
        <span className="font-mono">{id}</span>
        {readout && <span className="font-mono tabular-nums text-muted">{readout}</span>}
      </button>
    </Html>
  );
}

/** Selectable invisible hit-volume placed over a unit (broadens the click area). */
export function SelectHandle({
  id,
  args,
  position,
}: {
  id: EquipmentId;
  args: [number, number, number];
  position?: [number, number, number];
}) {
  const select = useSimulationStore((s) => s.selectEquipment);
  const hover = useRef(false);
  return (
    <mesh
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        select(id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover.current = true;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hover.current = false;
        document.body.style.cursor = "auto";
      }}
      visible={false}
    >
      <boxGeometry args={args} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}
