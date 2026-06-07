"use client";
/**
 * Cement hover/selection wrapper + telemetry driver — mirrors the refinery one.
 *  • onPointerOver/out → drive the single HTML tooltip (useCementStore.hoveredId)
 *  • optional unitId → click selects the live unit + pulsing ground ring
 *  • optional hitbox → invisible generous hover target
 */
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimStore } from "@/store/simStore";
import { CementEquipmentId, useCementStore } from "@/store/cementStore";

type Vec3 = [number, number, number];

/** Refreshes cement telemetry from the live sliders + model outputs (~4.5 Hz). */
export function CementTelemetry() {
  const acc = useRef(0);
  useFrame((state, dt) => {
    acc.current += dt;
    if (acc.current < 0.22) return;
    acc.current = 0;
    const p = useSimStore.getState().params.cement;
    const o = useSimStore.getState().outputs;
    useCementStore.getState().tick(state.clock.elapsedTime, {
      feed: p.rawFeedRate ?? 250,
      kilnSpeed: p.kilnSpeed ?? 3.5,
      fuel: p.burnerFuelRate ?? 12,
      fan: p.idFanSpeed ?? 85,
      burnTemp: o.cementBurnTemp ?? 1450,
      c3s: o.cementC3S ?? 60,
      production: o.cementProduction ?? 160,
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
  id: CementEquipmentId;
  position?: Vec3;
  unitId?: string;
  ring?: Vec3;
  hitbox?: Vec3;
  hitboxPos?: Vec3;
  children: React.ReactNode;
}) {
  const setHovered = useCementStore((s) => s.setHovered);
  const clearHovered = useCementStore((s) => s.clearHovered);
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
      {hitbox && (
        <mesh position={hitboxPos}>
          <boxGeometry args={hitbox} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      {children}

      {selected && ring && (
        <mesh ref={ringRef} position={[ring[0], 0.06, ring[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3, 0.1, 16, 64]} />
          <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
