"use client";
/**
 * Interactive wrapper for one piece of refinery equipment.
 *
 *  • onPointerOver / onPointerOut → drive the single HTML hover tooltip
 *    (via `useRefineryStore.hoveredId`).
 *  • optional `unitId` → clicking selects the live unit (reuses the existing
 *    simStore selection) and draws a pulsing cyan ground ring when selected.
 *  • optional `hitbox` → an invisible, generously-sized box so sparse / lattice
 *    structures (flare stack, pump rows) stay easy to hover.
 *
 * `RefineryTelemetry` is a render-less driver that refreshes the mocked DCS
 * tags ~4 Hz from the live oil sliders.
 */
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimStore } from "@/store/simStore";
import { EquipmentId, useRefineryStore } from "@/store/refineryStore";

type Vec3 = [number, number, number];

/** Refreshes refinery telemetry + fraction yields from the live oil params. */
export function RefineryTelemetry() {
  const acc = useRef(0);
  useFrame((state, dt) => {
    acc.current += dt;
    if (acc.current < 0.22) return; // ~4.5 Hz
    acc.current = 0;
    const p = useSimStore.getState().params.oil;
    useRefineryStore.getState().tick(state.clock.elapsedTime, {
      coilT: p.oilFurnaceTemp,
      feed: p.oilFeedRate,
      colP: p.oilColumnPressure,
      reflux: p.oilRefluxRatio,
      pumpSpeed: p.crudePumpSpeed ?? 80,
      desalterWater: p.desalterWater ?? 5,
      airRpm: p.airCoolerRpm ?? 1200,
      flareValve: p.flareValve ?? 0,
    });
  });
  return null;
}

export function Equipment({
  id,
  position = [0, 0, 0],
  unitId,
  ring,
  hitbox,
  hitboxPos = [0, 0, 0],
  children,
}: {
  id: EquipmentId;
  position?: Vec3;
  unitId?: string;
  ring?: Vec3;
  hitbox?: Vec3;
  hitboxPos?: Vec3;
  children: React.ReactNode;
}) {
  const setHovered = useRefineryStore((s) => s.setHovered);
  const clearHovered = useRefineryStore((s) => s.clearHovered);
  const setSelected = useSimStore((s) => s.setSelectedUnit);
  const selected = useSimStore((s) => (unitId ? s.selectedUnitId === unitId : false));
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + 0.06 * Math.sin(clock.elapsedTime * 4);
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(id);
        document.body.style.cursor = unitId ? "pointer" : "help";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        clearHovered(id);
        document.body.style.cursor = "auto";
      }}
      onClick={
        unitId
          ? (e) => {
              e.stopPropagation();
              setSelected(unitId);
            }
          : undefined
      }
    >
      {/* invisible but raycast-able hover target */}
      {hitbox && (
        <mesh position={hitboxPos}>
          <boxGeometry args={hitbox} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {children}

      {selected && ring && (
        <mesh ref={ringRef} position={[ring[0], 0.06, ring[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.4, 0.08, 16, 64]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
