"use client";
/** Shared, store-agnostic 3D helpers for the new process scenes. */
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useSimStore } from "@/store/simStore";

/** Glowing beads that travel from `from` → `to` to imply flow direction. */
export function FlowBeads({
  from,
  to,
  count = 3,
  color = "#22d3ee",
  speed = 1,
  radius = 0.09,
}: {
  from: [number, number, number];
  to: [number, number, number];
  count?: number;
  color?: string;
  speed?: number;
  radius?: number;
}) {
  const start = useRef(new THREE.Vector3(...from)).current;
  const end = useRef(new THREE.Vector3(...to)).current;
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const off = useRef(0);
  useFrame((_, dt) => {
    off.current = (off.current + dt * Math.max(0.05, speed) * 0.3) % 1;
    for (let i = 0; i < refs.current.length; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const f = (off.current + i / count) % 1;
      m.position.copy(start).lerp(end, f);
    }
  });
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }}>
          <sphereGeometry args={[radius, 10, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/** Floating HTML nameplate (no store dependency). */
export function SceneLabel({
  position,
  title,
  sub,
  color = "#e6edf5",
}: {
  position: [number, number, number];
  title: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} prepend>
      <div className="pointer-events-none whitespace-nowrap rounded-md border border-edge bg-panel/85 px-2 py-1 text-[11px] backdrop-blur-md">
        <span className="font-mono" style={{ color }}>
          {title}
        </span>
        {sub && <span className="ml-1.5 font-mono tabular-nums text-muted">{sub}</span>}
      </div>
    </Html>
  );
}

/** Animated flame: scale + colour driven by a 0..1 `heat`, reddening past `danger`. */
export function Flame({
  position,
  baseScale = 1,
  getHeat,
  getDanger,
}: {
  position: [number, number, number];
  baseScale?: number;
  getHeat: () => number;
  getDanger: () => boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const cool = useRef(new THREE.Color("#ffd27a"));
  const hot = useRef(new THREE.Color("#ff4530"));
  useFrame(({ clock }) => {
    const heat = Math.max(0, Math.min(getHeat(), 1));
    const danger = getDanger();
    const flicker = 0.9 + 0.1 * Math.sin(clock.elapsedTime * 18);
    const s = baseScale * (0.5 + heat * 0.9) * flicker;
    if (mesh.current) mesh.current.scale.set(s * 0.6, s, s * 0.6);
    if (mat.current) {
      mat.current.color.copy(cool.current).lerp(hot.current, danger ? 1 : heat * 0.7);
      mat.current.emissive.copy(mat.current.color);
      mat.current.emissiveIntensity = 1.4 + heat * 1.5;
    }
    if (light.current) {
      light.current.intensity = 40 + heat * 220;
      light.current.color.copy(cool.current).lerp(hot.current, danger ? 1 : heat * 0.7);
    }
  });
  return (
    <group position={position}>
      <mesh ref={mesh}>
        <coneGeometry args={[0.5, 1.6, 16]} />
        <meshStandardMaterial ref={mat} color="#ffb347" emissive="#ffb347" emissiveIntensity={2} toneMapped={false} transparent opacity={0.92} />
      </mesh>
      <pointLight ref={light} intensity={120} distance={26} color="#ffae57" />
    </group>
  );
}

/** Wraps a unit's meshes: click to select it (sets the global selected unit),
 *  shows a pointer cursor on hover, and draws a pulsing ring when selected. */
export function Selectable({
  unitId,
  ring,
  children,
}: {
  unitId: string;
  ring?: [number, number, number];
  children: React.ReactNode;
}) {
  const setSelected = useSimStore((s) => s.setSelectedUnit);
  const selected = useSimStore((s) => s.selectedUnitId === unitId);
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + 0.06 * Math.sin(clock.elapsedTime * 4);
      ringRef.current.scale.set(s, s, 1);
    }
  });
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        setSelected(unitId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {children}
      {selected && ring && (
        <mesh ref={ringRef} position={[ring[0], 0.06, ring[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.1, 0.07, 16, 64]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}
