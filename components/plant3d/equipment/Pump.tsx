"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/store/simulationStore";
import { PAINT_BLUE, SelectHandle, STEEL, UnitTag, useUnitVisual } from "../parts";
import type { EquipmentId } from "@/lib/simulation/types";

/** Centrifugal feed pump on a skid; the motor fan spins with delivered flow. */
export function Pump({ id, position }: { id: EquipmentId; position: [number, number, number] }) {
  const { eq } = useUnitVisual(id);
  const fan = useRef<THREE.Group>(null);
  const running = useSimulationStore((s) => s.controls.running);
  const flow = eq?.flowOut ?? 0;

  useFrame((_, dt) => {
    if (fan.current && running && flow > 0) fan.current.rotation.z += dt * (4 + flow * 0.05);
  });

  return (
    <group position={position}>
      {/* baseplate */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[1.7, 0.24, 1.0]} />
        <meshStandardMaterial color="#222a34" metalness={0.3} roughness={0.85} />
      </mesh>
      {/* motor */}
      <mesh position={[-0.35, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.32, 0.32, 0.9, 24]} />
        <meshStandardMaterial {...PAINT_BLUE} />
      </mesh>
      {/* volute casing */}
      <mesh position={[0.45, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.36, 24, 16]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      {/* discharge (up) + suction (side) nozzles */}
      <mesh position={[0.45, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 12]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <mesh position={[0.95, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.5, 12]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      {/* cooling fan (spins) */}
      <group ref={fan} position={[-0.82, 0.55, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            <boxGeometry args={[0.06, 0.5, 0.12]} />
            <meshStandardMaterial color="#1b2532" metalness={0.4} roughness={0.6} />
          </mesh>
        ))}
      </group>

      <SelectHandle id={id} args={[2.1, 1.6, 1.4]} position={[0, 0.8, 0]} />
      <UnitTag id={id} position={[0, 1.55, 0]} readout={`${flow.toFixed(0)} L/min`} />
    </group>
  );
}
