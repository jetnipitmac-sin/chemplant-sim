"use client";
/** Step 2 — Plant infrastructure: the connective tissue. */
import { useMemo } from "react";
import { Instance, Instances } from "@react-three/drei";
import { CABLE, PIPE_COLORS, STEEL_DK } from "./materials";

type Vec3 = [number, number, number];

/**
 * Long H-beam pipe rack running along Z, carrying dozens of parallel pipes of
 * varying diameter + colour. Pipes are a single instanced unit-cylinder (radius 1,
 * length 1, axis Y) laid along Z and scaled per instance → one draw call.
 */
export function PipeRack({
  position = [0, 0, 0],
  length = 34,
  width = 4,
  height = 4.5,
  bents = 12,
}: {
  position?: Vec3;
  length?: number;
  width?: number;
  height?: number;
  bents?: number;
}) {
  const bentZs = useMemo(
    () => Array.from({ length: bents }, (_, i) => -length / 2 + (i / (bents - 1)) * length),
    [bents, length],
  );

  const pipes = useMemo(() => {
    const arr: { x: number; y: number; r: number; color: string }[] = [];
    const levels = [height - 0.55, height - 1.35];
    levels.forEach((y, li) => {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const x = -width / 2 + 0.4 + (i / (n - 1)) * (width - 0.8);
        const r = 0.07 + ((i + li) % 4) * 0.045; // varying diameter
        arr.push({ x, y, r, color: PIPE_COLORS[(i + li * 2) % PIPE_COLORS.length] });
      }
    });
    return arr;
  }, [height, width]);

  return (
    <group position={position}>
      {/* portal-frame bents (H-columns + cross beams) */}
      {bentZs.map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          {[-width / 2, width / 2].map((x, j) => (
            <mesh key={j} position={[x, height / 2, 0]} castShadow>
              <boxGeometry args={[0.26, height, 0.26]} />
              <meshStandardMaterial {...STEEL_DK} />
            </mesh>
          ))}
          {[height - 0.55, height - 1.35].map((y, j) => (
            <mesh key={j} position={[0, y, 0]} castShadow>
              <boxGeometry args={[width + 0.3, 0.22, 0.22]} />
              <meshStandardMaterial {...STEEL_DK} />
            </mesh>
          ))}
        </group>
      ))}

      {/* instanced pipes spanning the full length */}
      <Instances limit={pipes.length} castShadow>
        <cylinderGeometry args={[1, 1, 1, 12]} />
        <meshStandardMaterial metalness={0.7} roughness={0.4} />
        {pipes.map((p, i) => (
          <Instance key={i} position={[p.x, p.y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[p.r, length, p.r]} color={p.color} />
        ))}
      </Instances>
    </group>
  );
}

/** Dark cable-tray runs alongside the pipe rack. */
export function CableTrays({ position = [0, 0, 0], length = 34 }: { position?: Vec3; length?: number }) {
  return (
    <group position={position}>
      {[2.1, 2.55].map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.1, length]} />
            <meshStandardMaterial {...CABLE} />
          </mesh>
          {[-0.28, 0.28].map((x, j) => (
            <mesh key={j} position={[x, 0.08, 0]}>
              <boxGeometry args={[0.04, 0.18, length]} />
              <meshStandardMaterial {...CABLE} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}
