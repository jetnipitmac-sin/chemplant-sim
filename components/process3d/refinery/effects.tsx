"use client";
/**
 * Param-driven volumetric effects for the refinery scene.
 *
 * `Plume` is a cheap billboard-puff emitter: a handful of soft spheres that rise,
 * expand and fade on a loop. Its density is gated live by `getIntensity()` (0..1),
 * read every frame from the store — so smoke / vapour appears exactly when the
 * matching mission drives a parameter out of band, with zero re-renders.
 */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

type Vec3 = [number, number, number];

export function Plume({
  position = [0, 0, 0],
  color = "#8a8a8a",
  getIntensity,
  count = 9,
  rise = 3,
  spread = 0.6,
  size = 0.6,
  speed = 0.35,
  emissive = false,
}: {
  position?: Vec3;
  color?: string;
  /** 0..1 density gate, sampled every frame (live store read). */
  getIntensity: () => number;
  count?: number;
  rise?: number;
  spread?: number;
  size?: number;
  speed?: number;
  /** Glowing puffs (fire embers) vs. matte (smoke/vapour). */
  emissive?: boolean;
}) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        ph: i / count,
        x: Math.random() * 2 - 1,
        z: Math.random() * 2 - 1,
        drift: Math.random() * 2 - 1,
      })),
    [count],
  );

  useFrame(({ clock }) => {
    const I = Math.max(0, Math.min(1, getIntensity()));
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const m = refs.current[i];
      if (!m) continue;
      if (I < 0.02) {
        m.visible = false;
        continue;
      }
      m.visible = true;
      const s = seeds[i];
      const life = (t * speed * (0.7 + 0.6 * I) + s.ph) % 1;
      const y = life * rise * (0.6 + 0.6 * I);
      m.position.set(s.x * spread * (0.4 + life) + s.drift * life * 0.6, y, s.z * spread * (0.4 + life));
      m.scale.setScalar(size * (0.45 + life * 1.9) * (0.55 + 0.45 * I));
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = (1 - life) * (emissive ? 0.8 : 0.55) * Math.min(1, I * 1.4);
    }
  });

  return (
    <group position={position}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          visible={false}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial
            color={color}
            emissive={emissive ? color : "#000000"}
            emissiveIntensity={emissive ? 2 : 0}
            transparent
            opacity={0}
            depthWrite={false}
            toneMapped={!emissive}
          />
        </mesh>
      ))}
    </group>
  );
}
