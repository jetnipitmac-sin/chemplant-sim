"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/store/simulationStore";
import { useSimStore } from "@/store/simStore";
import { EmissivePulse, SelectHandle, STEEL, STEEL_DARK, UnitTag, useUnitVisual } from "../parts";
import { ReactorFluid } from "../FluidShader";
import type { EquipmentId } from "@/lib/simulation/types";

/** Jacketed CSTR with a (rotating) agitator, dished heads and process nozzles. */
export function Reactor({ id, position }: { id: EquipmentId; position: [number, number, number] }) {
  const { eq, status, thermal } = useUnitVisual(id);
  const body = useRef<THREE.MeshStandardMaterial>(null);
  const shaft = useRef<THREE.Group>(null);
  const running = useSimulationStore((s) => s.controls.running);
  const xray = useSimStore((s) => s.xray);
  const R = 1.4;
  const H = 3.2;
  const baseY = 1.0;

  useFrame((_, dt) => {
    if (shaft.current && running) shaft.current.rotation.y += dt * 4;
  });

  const shellColor = "#7d8a99";
  return (
    <group position={position}>
      {/* support skirt */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[R * 0.85, R * 0.95, 1.0, 36]} />
        <meshStandardMaterial color="#39444f" metalness={0.7} roughness={0.5} />
      </mesh>
      {/* cooling jacket (semi-transparent outer shell) */}
      <mesh position={[0, baseY + H / 2, 0]}>
        <cylinderGeometry args={[R * 1.13, R * 1.13, H * 0.86, 48]} />
        <meshStandardMaterial {...STEEL_DARK} transparent opacity={0.4} />
      </mesh>
      {/* X-ray fluid core (visible when the shell turns transparent) */}
      <ReactorFluid radius={R * 0.9} height={H * 0.96} position={[0, baseY + H / 2, 0]} />
      {/* vessel body */}
      <mesh position={[0, baseY + H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[R, R, H, 48]} />
        <meshStandardMaterial
          ref={body}
          color={shellColor}
          metalness={0.7}
          roughness={0.35}
          transparent
          opacity={xray ? 0.12 : 1}
          depthWrite={!xray}
        />
      </mesh>
      {/* dished heads */}
      <mesh position={[0, baseY + H, 0]} castShadow>
        <sphereGeometry args={[R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={shellColor} metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, baseY, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <sphereGeometry args={[R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={shellColor} metalness={0.7} roughness={0.35} />
      </mesh>
      {/* agitator drive */}
      <mesh position={[0, baseY + H + R * 0.5 + 0.5, 0]} castShadow>
        <boxGeometry args={[0.7, 0.8, 0.7]} />
        <meshStandardMaterial color="#1f6f8b" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, baseY + H + R * 0.5 + 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.3, 16]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      {/* rotating shaft + impeller */}
      <group ref={shaft} position={[0, baseY + H / 2, 0]}>
        <mesh position={[0, H * 0.2, 0]}>
          <cylinderGeometry args={[0.07, 0.07, H, 12]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[0, -H * 0.28, 0]}>
          <boxGeometry args={[R * 1.1, 0.08, 0.18]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[0, -H * 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[R * 1.1, 0.08, 0.18]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      </group>
      {/* feed-in & product-out nozzles */}
      <mesh position={[-R * 1.08, baseY + H * 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.6, 12]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      <mesh position={[R * 1.08, baseY + H * 0.18, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.6, 12]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>

      <EmissivePulse material={body} status={status} thermal={thermal} />
      <SelectHandle id={id} args={[R * 3, H + 2.5, R * 3]} position={[0, (H + 2.5) / 2, 0]} />
      <UnitTag id={id} position={[0, baseY + H + R * 0.5 + 1.6, 0]} readout={`${(eq?.temperature ?? 0).toFixed(0)}K`} />
    </group>
  );
}
