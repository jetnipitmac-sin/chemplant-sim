"use client";
import { useRef } from "react";
import * as THREE from "three";
import { EmissivePulse, SelectHandle, STEEL, STEEL_DARK, UnitTag, useUnitVisual } from "../parts";
import type { EquipmentId } from "@/lib/simulation/types";

/** Tall trayed column with overhead condenser drum and a base reboiler. */
export function DistillationColumn({ id, position }: { id: EquipmentId; position: [number, number, number] }) {
  const { eq, status, thermal } = useUnitVisual(id);
  const shell = useRef<THREE.MeshStandardMaterial>(null);
  const R = 0.95;
  const H = 8.5;
  const trays = 8;
  const baseY = 1.2;

  return (
    <group position={position}>
      {/* skirt */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[R * 0.9, R, 1.2, 36]} />
        <meshStandardMaterial color="#39444f" metalness={0.7} roughness={0.5} />
      </mesh>
      {/* shell */}
      <mesh position={[0, baseY + H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, H, 48]} />
        <meshStandardMaterial ref={shell} color="#c6ced7" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* top head */}
      <mesh position={[0, baseY + H, 0]} castShadow>
        <sphereGeometry args={[R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c6ced7" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* tray flanges */}
      {Array.from({ length: trays }).map((_, i) => (
        <mesh key={i} position={[0, baseY + H * ((i + 0.5) / trays), 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[R * 1.02, 0.05, 10, 48]} />
          <meshStandardMaterial {...STEEL_DARK} />
        </mesh>
      ))}
      {/* overhead condenser drum (horizontal) */}
      <group position={[R + 0.95, baseY + H - 0.4, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 1.8, 24]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[0, 0.9, 0]} castShadow>
          <sphereGeometry args={[0.45, 16, 12]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[0, -0.9, 0]} castShadow>
          <sphereGeometry args={[0.45, 16, 12]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      </group>
      {/* reflux line */}
      <mesh position={[R + 0.45, baseY + H - 0.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 1.0, 12]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      {/* reboiler (base, horizontal, warm copper) */}
      <group position={[R + 0.85, 1.5, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 2.0, 24]} />
          <meshStandardMaterial color="#8a6240" metalness={0.6} roughness={0.5} />
        </mesh>
      </group>
      {/* feed nozzle */}
      <mesh position={[-R * 1.05, baseY + H * 0.45, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.6, 12]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>

      <EmissivePulse material={shell} status={status} thermal={thermal} />
      <SelectHandle id={id} args={[R * 3, H + 2, R * 3]} position={[0, (H + 2) / 2, 0]} />
      <UnitTag id={id} position={[0, baseY + H + 0.95, 0]} readout={`${((eq?.purity ?? 0) * 100).toFixed(0)}% B`} />
    </group>
  );
}
