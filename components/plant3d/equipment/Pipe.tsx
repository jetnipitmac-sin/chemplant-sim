"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimulationStore } from "@/store/simulationStore";
import { STEEL_DARK } from "../parts";
import type { EquipmentId } from "@/lib/simulation/types";

/**
 * Straight pipe run between two points, with glowing "flow beads" that travel
 * along it at a speed proportional to the live volumetric flow of `flowSource`.
 */
export function Pipe({
  from,
  to,
  radius = 0.11,
  flowSource,
  beads = 3,
}: {
  from: [number, number, number];
  to: [number, number, number];
  radius?: number;
  flowSource?: EquipmentId;
  beads?: number;
}) {
  const start = useMemo(() => new THREE.Vector3(...from), [from]);
  const end = useMemo(() => new THREE.Vector3(...to), [to]);
  const { mid, len, quat } = useMemo(() => {
    const dir = end.clone().sub(start);
    const length = dir.length();
    const center = start.clone().add(end).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { mid: center, len: length, quat: q };
  }, [start, end]);

  const beadRefs = useRef<(THREE.Mesh | null)[]>([]);
  const offset = useRef(0);

  useFrame((_, dt) => {
    const s = useSimulationStore.getState();
    const flow = flowSource ? s.snapshot?.equipment[flowSource]?.flowOut ?? 0 : 60;
    const running = s.controls.running;
    offset.current = (offset.current + dt * (flow / 100) * (running ? 1 : 0)) % 1;
    for (let i = 0; i < beadRefs.current.length; i++) {
      const m = beadRefs.current[i];
      if (!m) continue;
      const f = (offset.current + i / beads) % 1;
      m.position.copy(start).lerp(end, f);
      m.visible = flow > 0.5;
    }
  });

  return (
    <group>
      <mesh position={mid} quaternion={quat} castShadow>
        <cylinderGeometry args={[radius, radius, len, 16]} />
        <meshStandardMaterial {...STEEL_DARK} />
      </mesh>
      {/* end flanges */}
      <mesh position={start} quaternion={quat}>
        <cylinderGeometry args={[radius * 1.6, radius * 1.6, 0.12, 16]} />
        <meshStandardMaterial {...STEEL_DARK} />
      </mesh>
      <mesh position={end} quaternion={quat}>
        <cylinderGeometry args={[radius * 1.6, radius * 1.6, 0.12, 16]} />
        <meshStandardMaterial {...STEEL_DARK} />
      </mesh>
      {/* flow beads */}
      {Array.from({ length: beads }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            beadRefs.current[i] = el;
          }}
        >
          <sphereGeometry args={[radius * 1.5, 12, 8]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
