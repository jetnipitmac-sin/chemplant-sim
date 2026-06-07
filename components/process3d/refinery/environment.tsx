"use client";
/** Step 3 — Macro-scale background & environment. */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import { CONCRETE_LT, STEEL_DK, TANK } from "./materials";
import { Plume } from "./effects";

type Vec3 = [number, number, number];

/** Grid of large vertical storage tanks inside a low concrete containment dike. */
export function TankFarm({
  position = [0, 0, 0],
  rows = 2,
  cols = 4,
  spacing = 7,
  tankR = 2.6,
  tankH = 5,
}: {
  position?: Vec3;
  rows?: number;
  cols?: number;
  spacing?: number;
  tankR?: number;
  tankH?: number;
}) {
  const tanks = useMemo(() => {
    const a: Vec3[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) a.push([(c - (cols - 1) / 2) * spacing, 0, (r - (rows - 1) / 2) * spacing]);
    return a;
  }, [rows, cols, spacing]);

  const halfW = ((cols - 1) * spacing) / 2 + tankR + 1.5;
  const halfD = ((rows - 1) * spacing) / 2 + tankR + 1.5;

  return (
    <group position={position}>
      {/* containment dike (perimeter) */}
      {[
        [0, 0.4, halfD, halfW * 2, 0.8, 0.4],
        [0, 0.4, -halfD, halfW * 2, 0.8, 0.4],
        [halfW, 0.4, 0, 0.4, 0.8, halfD * 2],
        [-halfW, 0.4, 0, 0.4, 0.8, halfD * 2],
      ].map((b, i) => (
        <mesh key={i} position={[b[0], b[1], b[2]]} receiveShadow castShadow>
          <boxGeometry args={[b[3], b[4], b[5]]} />
          <meshStandardMaterial {...CONCRETE_LT} />
        </mesh>
      ))}
      {/* tank shells */}
      <Instances limit={tanks.length} castShadow>
        <cylinderGeometry args={[tankR, tankR, tankH, 32]} />
        <meshStandardMaterial {...TANK} />
        {tanks.map((p, i) => (
          <Instance key={i} position={[p[0], tankH / 2, p[2]]} />
        ))}
      </Instances>
      {/* domed roofs */}
      <Instances limit={tanks.length}>
        <sphereGeometry args={[tankR, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...TANK} metalness={0.5} roughness={0.45} />
        {tanks.map((p, i) => (
          <Instance key={i} position={[p[0], tankH, p[2]]} />
        ))}
      </Instances>
    </group>
  );
}

/**
 * Animated flare tip: a pilot flame that roars up into a towering fire as the
 * emergency flare valve opens. `getBoost()` returns the live flare-release
 * fraction (0..1); it scales the flame, the pulsing light and the smoke plume.
 */
function FlareTip({ y, getBoost }: { y: number; getBoost?: () => number }) {
  const flame = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const b = getBoost ? Math.max(0, Math.min(1, getBoost())) : 0;
    const flick = 0.85 + 0.12 * Math.sin(t * 13) + 0.08 * Math.sin(t * 29 + 1);
    const h = (0.5 + b * 2.8) * flick; // pilot → roaring column of fire
    const w = 0.55 + b * 1.2;
    if (flame.current) flame.current.scale.set(w, h, w);
    if (light.current) light.current.intensity = (45 + 470 * b) * (0.85 + 0.15 * Math.sin(t * 9));
  });
  return (
    <group position={[0, y, 0]}>
      {/* flare tip nozzle */}
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.28, 0.34, 1.4, 12]} />
        <meshStandardMaterial {...STEEL_DK} />
      </mesh>
      <group ref={flame} position={[0, 0.9, 0]}>
        <mesh>
          <coneGeometry args={[0.62, 2.4, 16]} />
          <meshStandardMaterial color="#ff7a1e" emissive="#ff5a10" emissiveIntensity={2.6} toneMapped={false} transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, -0.2, 0]}>
          <coneGeometry args={[0.34, 1.5, 16]} />
          <meshStandardMaterial color="#ffd24a" emissive="#ffd24a" emissiveIntensity={3.2} toneMapped={false} transparent opacity={0.95} />
        </mesh>
      </group>
      <pointLight ref={light} position={[0, 1, 0]} color="#ff7a2a" intensity={260} distance={60} />
      {/* oily smoke billowing off a hard-burning flare */}
      <Plume position={[0, 4, 0]} color="#4a4038" count={12} rise={14} spread={1.7} size={1.7} speed={0.26} getIntensity={() => (getBoost ? getBoost() : 0)} />
    </group>
  );
}

/** Very tall lattice flare stack (truss tower) for the far background. */
export function FlareStack({
  position = [0, 0, 0],
  height = 42,
  halfW = 0.7,
  getBoost,
}: {
  position?: Vec3;
  height?: number;
  halfW?: number;
  /** Live flare-release fraction (0..1) driving the flame size. */
  getBoost?: () => number;
}) {
  const N = 15;
  const seg = height / N;
  const theta = Math.atan2(seg, 2 * halfW);
  const diagLen = Math.hypot(2 * halfW, seg);

  const legXBeams = useMemo(() => Array.from({ length: N }, (_, i) => (i + 1) * seg), [seg]);
  const diagonals = useMemo(() => {
    const arr: { pos: Vec3; rot: Vec3 }[] = [];
    [halfW, -halfW].forEach((z) => {
      for (let i = 0; i < N; i++) {
        const dir = i % 2 === 0 ? 1 : -1;
        arr.push({ pos: [0, i * seg + seg / 2, z], rot: [0, 0, theta * dir] });
      }
    });
    return arr;
  }, [seg, theta, halfW]);

  return (
    <group position={position}>
      {/* 4 legs */}
      {[
        [halfW, halfW],
        [-halfW, halfW],
        [halfW, -halfW],
        [-halfW, -halfW],
      ].map((c, i) => (
        <mesh key={i} position={[c[0], height / 2, c[1]]} castShadow>
          <boxGeometry args={[0.18, height, 0.18]} />
          <meshStandardMaterial {...STEEL_DK} />
        </mesh>
      ))}
      {/* horizontal ring beams (X then Z direction) */}
      <Instances limit={legXBeams.length * 2}>
        <boxGeometry args={[2 * halfW, 0.1, 0.1]} />
        <meshStandardMaterial {...STEEL_DK} />
        {legXBeams.flatMap((y, i) =>
          [halfW, -halfW].map((z, j) => <Instance key={`${i}-${j}`} position={[0, y, z]} />),
        )}
      </Instances>
      <Instances limit={legXBeams.length * 2}>
        <boxGeometry args={[0.1, 0.1, 2 * halfW]} />
        <meshStandardMaterial {...STEEL_DK} />
        {legXBeams.flatMap((y, i) =>
          [halfW, -halfW].map((x, j) => <Instance key={`${i}-${j}`} position={[x, y, 0]} />),
        )}
      </Instances>
      {/* diagonal braces on the front/back faces */}
      <Instances limit={diagonals.length}>
        <boxGeometry args={[diagLen, 0.07, 0.07]} />
        <meshStandardMaterial {...STEEL_DK} />
        {diagonals.map((d, i) => (
          <Instance key={i} position={d.pos} rotation={d.rot} />
        ))}
      </Instances>
      {/* riser pipe up one side + flame */}
      <mesh position={[halfW, height / 2, 0]}>
        <cylinderGeometry args={[0.14, 0.14, height, 12]} />
        <meshStandardMaterial {...STEEL_DK} />
      </mesh>
      <FlareTip y={height} getBoost={getBoost} />
    </group>
  );
}
