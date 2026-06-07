"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/store/simulationStore";
import { Tank } from "./equipment/Tank";
import { Reactor } from "./equipment/Reactor";
import { DistillationColumn } from "./equipment/DistillationColumn";
import { Pump } from "./equipment/Pump";
import { Pipe } from "./equipment/Pipe";
import type { EquipmentId } from "@/lib/simulation/types";

/** Ground-plane positions of every unit (x, y, z). */
export const PLANT_POSITIONS: Record<EquipmentId, [number, number, number]> = {
  "T-101": [-10, 0, 0],
  "P-101": [-6.5, 0, 0],
  "R-101": [-2.5, 0, 0],
  "C-101": [3.5, 0, 0],
  "D-101": [8.5, 0, -2],
  "D-102": [8.5, 0, 2],
};

function SelectionRing() {
  const sel = useSimulationStore((s) => s.selectedEquipment);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      const s = 1 + 0.05 * Math.sin(clock.elapsedTime * 4);
      ref.current.scale.set(s, s, 1);
    }
  });
  if (!sel) return null;
  const p = PLANT_POSITIONS[sel];
  return (
    <mesh ref={ref} position={[p[0], 0.06, p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[2.0, 0.06, 16, 64]} />
      <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} toneMapped={false} />
    </mesh>
  );
}

/** The full process train: equipment + interconnecting piping. */
export function PlantModel() {
  return (
    <group>
      <Tank id="T-101" position={PLANT_POSITIONS["T-101"]} color="#33597f" />
      <Pump id="P-101" position={PLANT_POSITIONS["P-101"]} />
      <Reactor id="R-101" position={PLANT_POSITIONS["R-101"]} />
      <DistillationColumn id="C-101" position={PLANT_POSITIONS["C-101"]} />
      <Tank id="D-101" position={PLANT_POSITIONS["D-101"]} height={4.0} radius={1.3} color="#2f6f5e" />
      <Tank id="D-102" position={PLANT_POSITIONS["D-102"]} height={4.0} radius={1.3} color="#6b4a7a" />

      {/* Feed tank → pump → reactor */}
      <Pipe from={[-8.4, 1.3, 0]} to={[-7.0, 1.3, 0]} flowSource="T-101" />
      <Pipe from={[-6.1, 1.0, 0]} to={[-6.1, 3.3, 0]} flowSource="P-101" />
      <Pipe from={[-6.1, 3.3, 0]} to={[-3.95, 3.3, 0]} flowSource="P-101" />
      {/* reactor → column feed */}
      <Pipe from={[-0.99, 1.4, 0]} to={[-0.99, 5.2, 0]} flowSource="R-101" />
      <Pipe from={[-0.99, 5.2, 0]} to={[2.5, 5.2, 0]} flowSource="R-101" />
      {/* column overhead → product tank D-101 */}
      <Pipe from={[4.9, 9.3, 0]} to={[8.5, 9.3, 0]} flowSource="C-101" />
      <Pipe from={[8.5, 9.3, 0]} to={[8.5, 9.3, -2]} flowSource="C-101" />
      <Pipe from={[8.5, 9.3, -2]} to={[8.5, 5.7, -2]} flowSource="C-101" />
      {/* column bottoms → bottoms tank D-102 */}
      <Pipe from={[3.5, 1.3, 0]} to={[8.5, 1.3, 0]} flowSource="C-101" />
      <Pipe from={[8.5, 1.3, 0]} to={[8.5, 1.3, 2]} flowSource="C-101" />

      <SelectionRing />
    </group>
  );
}
