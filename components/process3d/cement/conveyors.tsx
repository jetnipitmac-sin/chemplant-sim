"use client";
/**
 * Solids-handling connectors for the cement plant: enclosed inclined conveyor
 * galleries (rectangular bridges on legs, with an animated belt deck) and large
 * air ducts — NOT pipes.
 */
import { useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { CONCRETE, STEEL_DK, STEEL_MD } from "../refinery/materials";
import { makeBeltTexture } from "./motion";

type Vec3 = [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);

/** Enclosed conveyor gallery with a continuously-running (texture-animated) belt deck. */
export function ConveyorGallery({
  from,
  to,
  w = 1.6,
  h = 1.7,
  legs = 2,
  speed = 0.5,
}: {
  from: Vec3;
  to: Vec3;
  w?: number;
  h?: number;
  legs?: number;
  /** belt-flow speed (texture offset units/s). */
  speed?: number;
}) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const ndir = dir.clone().normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, ndir);

  // Basis for a flat belt deck that lies along the incline with its normal ≈ up,
  // and its V (texture) axis running along the belt length.
  let xAxis = new THREE.Vector3().crossVectors(UP, ndir);
  if (xAxis.lengthSq() < 1e-4) xAxis = new THREE.Vector3(1, 0, 0);
  xAxis.normalize();
  const zAxis = new THREE.Vector3().crossVectors(xAxis, ndir).normalize();
  const beltQuat = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, ndir, zAxis));

  // One belt texture per gallery, tiled along its length; its offset is animated.
  const tex = useMemo(() => {
    const t = makeBeltTexture();
    t.repeat.set(1, Math.max(2, len / 2.2));
    return t;
  }, [len]);
  useFrame((_, dt) => {
    tex.offset.y -= dt * speed; // scrolls toward the downstream (`to`) end
  });

  const beltPos: Vec3 = [mid.x, mid.y + h * 0.5 + 0.05, mid.z];

  const legPts: { x: number; z: number; hgt: number }[] = [];
  for (let i = 1; i <= legs; i++) {
    const p = a.clone().lerp(b, i / (legs + 1));
    legPts.push({ x: p.x, z: p.z, hgt: Math.max(0.4, p.y) });
  }

  return (
    <group>
      {/* enclosed gallery housing */}
      <mesh position={mid} quaternion={q} castShadow receiveShadow>
        <boxGeometry args={[w, len, h]} />
        <meshStandardMaterial {...STEEL_MD} />
      </mesh>
      {/* animated belt deck — chevrons run toward the discharge end (raw material in motion) */}
      <mesh position={beltPos} quaternion={beltQuat}>
        <planeGeometry args={[w * 0.82, len]} />
        <meshStandardMaterial map={tex} side={THREE.DoubleSide} metalness={0.2} roughness={0.85} />
      </mesh>
      {/* support legs to grade */}
      {legPts.map((l, i) => (
        <mesh key={i} position={[l.x, l.hgt / 2, l.z]} castShadow>
          <boxGeometry args={[0.3, l.hgt, 0.3]} />
          <meshStandardMaterial {...CONCRETE} />
        </mesh>
      ))}
      {/* head/tail drive pulleys (dark caps) at each end */}
      {[a, b].map((p, i) => (
        <mesh key={i} position={[p.x, p.y + h * 0.5 + 0.05, p.z]} quaternion={beltQuat}>
          <boxGeometry args={[w * 0.86, 0.4, 0.22]} />
          <meshStandardMaterial {...STEEL_DK} />
        </mesh>
      ))}
    </group>
  );
}

/** A large-diameter air/gas duct (tertiary air, exhaust) between two points. */
export function Duct({ from, to, r = 0.7, color = "#5b6470" }: { from: Vec3; to: Vec3; r?: number; color?: string }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  return (
    <mesh position={mid} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, dir.length(), 20]} />
      <meshStandardMaterial color={color} metalness={0.4} roughness={0.75} />
    </mesh>
  );
}
