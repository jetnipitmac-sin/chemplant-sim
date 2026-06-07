"use client";
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { EmissivePulse, SelectHandle, STEEL, UnitTag, useUnitVisual } from "../parts";
import type { EquipmentId } from "@/lib/simulation/types";

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** Vertical storage tank with a domed top and a live sight-glass level gauge. */
export function Tank({
  id,
  position,
  height = 4.2,
  radius = 1.5,
  color = "#33597f",
}: {
  id: EquipmentId;
  position: [number, number, number];
  height?: number;
  radius?: number;
  color?: string;
}) {
  const { eq, status, thermal } = useUnitVisual(id);
  const band = useRef<THREE.MeshStandardMaterial>(null);
  const fill = useRef<THREE.Mesh>(null);
  const glassH = height * 0.82;
  const levelFrac = clamp((eq?.level ?? 50) / 100, 0.02, 1);

  useFrame(() => {
    const m = fill.current;
    if (!m) return;
    m.scale.y += (levelFrac - m.scale.y) * 0.1;
    m.position.y = -glassH / 2 + (m.scale.y * glassH) / 2;
  });

  return (
    <group position={position}>
      {/* concrete pad + steel skirt */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[radius * 1.25, radius * 1.3, 0.16, 36]} />
        <meshStandardMaterial color="#222a34" metalness={0.2} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[radius * 0.98, radius * 1.02, 0.8, 36]} />
        <meshStandardMaterial color="#3a4654" metalness={0.7} roughness={0.5} />
      </mesh>
      {/* body */}
      <mesh position={[0, 0.9 + height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 48]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.4} />
      </mesh>
      {/* dome */}
      <mesh position={[0, 0.9 + height, 0]} castShadow>
        <sphereGeometry args={[radius, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.38} />
      </mesh>
      {/* top nozzle */}
      <mesh position={[0, 0.9 + height + radius * 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.5, 16]} />
        <meshStandardMaterial {...STEEL} />
      </mesh>
      {/* girth indicator band (thermal / alarm) */}
      <mesh position={[0, 0.9 + height * 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 1.01, 0.06, 12, 48]} />
        <meshStandardMaterial ref={band} color="#0b0f15" emissive="#0e7490" emissiveIntensity={0.3} metalness={0.3} roughness={0.6} />
      </mesh>
      {/* sight glass on +Z face */}
      <group position={[0, 0.9 + height / 2, radius + 0.05]}>
        <mesh>
          <cylinderGeometry args={[0.11, 0.11, glassH, 16]} />
          <meshStandardMaterial color="#0a0f16" metalness={0.2} roughness={0.1} transparent opacity={0.35} />
        </mesh>
        <mesh ref={fill}>
          <cylinderGeometry args={[0.08, 0.08, glassH, 16]} />
          <meshStandardMaterial color="#21c7d6" emissive="#0e7490" emissiveIntensity={0.7} transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, glassH / 2, 0]}>
          <sphereGeometry args={[0.12, 12, 8]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[0, -glassH / 2, 0]}>
          <sphereGeometry args={[0.12, 12, 8]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      </group>

      <EmissivePulse material={band} status={status} thermal={thermal} />
      <SelectHandle id={id} args={[radius * 2.4, height + 1.6, radius * 2.4]} position={[0, (height + 1.6) / 2, 0]} />
      <UnitTag id={id} position={[0, 0.9 + height + radius * 0.6 + 0.4, 0]} readout={`${(eq?.level ?? 0).toFixed(0)}%`} />
    </group>
  );
}
