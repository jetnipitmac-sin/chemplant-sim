"use client";
/** Step 1 — Unit-level detail grouped around the distillation column. */
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import { CONCRETE, PAINT_BLUE, STEEL_DK, STEEL_LT, STEEL_MD } from "./materials";

type Vec3 = [number, number, number];

/** Stacked shell-&-tube heat exchangers (horizontal cylinders + channel heads + saddles). */
export function HeatExchangers({ position = [0, 0, 0], shells = 2 }: { position?: Vec3; shells?: number }) {
  const r = 0.55;
  const len = 4;
  return (
    <group position={position}>
      {Array.from({ length: shells }).map((_, i) => {
        const y = 0.95 + i * 1.25;
        return (
          <group key={i} position={[0, y, 0]}>
            {/* shell */}
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[r, r, len, 24]} />
              <meshStandardMaterial {...STEEL_MD} />
            </mesh>
            {/* channel head (bolted, fatter) */}
            <mesh position={[len / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[r * 1.14, r * 1.14, 0.5, 24]} />
              <meshStandardMaterial {...STEEL_DK} />
            </mesh>
            {/* dished end */}
            <mesh position={[-len / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
              <sphereGeometry args={[r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial {...STEEL_MD} />
            </mesh>
            {/* nozzles */}
            {[len * 0.28, -len * 0.28].map((nx, j) => (
              <mesh key={j} position={[nx, r, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.1, 0.5, 12]} />
                <meshStandardMaterial {...STEEL_LT} />
              </mesh>
            ))}
            {/* saddle supports */}
            {[len * 0.3, -len * 0.3].map((sx, j) => (
              <mesh key={j} position={[sx, -r - 0.22, 0]} castShadow>
                <boxGeometry args={[0.3, 0.5, r * 2]} />
                <meshStandardMaterial {...CONCRETE} />
              </mesh>
            ))}
          </group>
        );
      })}
      {/* riser connecting the two shells */}
      <mesh position={[len * 0.4, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 1.4, 12]} />
        <meshStandardMaterial {...STEEL_LT} />
      </mesh>
    </group>
  );
}

/** Large fat horizontal capsule vessel (desalter) on a concrete base. */
export function Desalter({ position = [0, 0, 0] }: { position?: Vec3 }) {
  const R = 1.25;
  const L = 5;
  const cy = R + 0.9;
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} receiveShadow castShadow>
        <boxGeometry args={[L * 0.92, 0.9, R * 2.3]} />
        <meshStandardMaterial {...CONCRETE} />
      </mesh>
      {[L * 0.32, -L * 0.32].map((sx, i) => (
        <mesh key={i} position={[sx, cy - R - 0.45, 0]} castShadow>
          <boxGeometry args={[0.4, 0.9, R * 2]} />
          <meshStandardMaterial {...STEEL_DK} />
        </mesh>
      ))}
      <mesh position={[0, cy, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[R, R, L, 28]} />
        <meshStandardMaterial {...STEEL_MD} />
      </mesh>
      <mesh position={[L / 2, cy, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <sphereGeometry args={[R, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...STEEL_MD} />
      </mesh>
      <mesh position={[-L / 2, cy, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <sphereGeometry args={[R, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...STEEL_MD} />
      </mesh>
      {[-1.2, 0, 1.2].map((nx, i) => (
        <mesh key={i} position={[nx, cy + R, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.13, 0.6, 12]} />
          <meshStandardMaterial {...STEEL_LT} />
        </mesh>
      ))}
    </group>
  );
}

/** Elevated fin-fan air coolers; the fans below spin. */
export function AirCoolers({ position = [0, 0, 0], bays = 3 }: { position?: Vec3; bays?: number }) {
  const fansRef = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    fansRef.current?.children.forEach((bay) => {
      const blades = bay.children[1];
      if (blades) blades.rotation.y += dt * 2.4;
    });
  });
  const deckW = bays * 2.4;
  const deckD = 3;
  const deckY = 5;
  const legs: Vec3[] = [
    [-deckW / 2 + 0.3, deckY / 2, deckD / 2 - 0.3],
    [deckW / 2 - 0.3, deckY / 2, deckD / 2 - 0.3],
    [-deckW / 2 + 0.3, deckY / 2, -deckD / 2 + 0.3],
    [deckW / 2 - 0.3, deckY / 2, -deckD / 2 + 0.3],
  ];
  return (
    <group position={position}>
      {legs.map((c, i) => (
        <mesh key={i} position={c} castShadow>
          <boxGeometry args={[0.22, deckY, 0.22]} />
          <meshStandardMaterial {...STEEL_DK} />
        </mesh>
      ))}
      <mesh position={[0, deckY, 0]} castShadow receiveShadow>
        <boxGeometry args={[deckW, 0.5, deckD]} />
        <meshStandardMaterial {...STEEL_MD} />
      </mesh>
      <mesh position={[0, deckY + 0.32, 0]}>
        <boxGeometry args={[deckW, 0.18, 0.3]} />
        <meshStandardMaterial {...STEEL_LT} />
      </mesh>
      <group ref={fansRef} position={[0, deckY - 0.4, 0]}>
        {Array.from({ length: bays }).map((_, i) => (
          <group key={i} position={[-deckW / 2 + 1.2 + i * 2.4, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.95, 0.95, 0.08, 24]} />
              <meshStandardMaterial {...STEEL_DK} />
            </mesh>
            <group>
              {[0, 1, 2, 3].map((b) => (
                <mesh key={b} rotation={[0, (b * Math.PI) / 2, 0]} position={[0, -0.05, 0]}>
                  <boxGeometry args={[1.7, 0.04, 0.2]} />
                  <meshStandardMaterial {...STEEL_LT} />
                </mesh>
              ))}
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/** A row of pump+motor skids on concrete pads (instanced for performance). */
export function Pumps({ positions }: { positions: Vec3[] }) {
  return (
    <>
      <Instances limit={positions.length}>
        <boxGeometry args={[1.5, 0.22, 0.95]} />
        <meshStandardMaterial {...CONCRETE} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0], 0.11, p[2]]} />
        ))}
      </Instances>
      {/* motors */}
      <Instances limit={positions.length}>
        <cylinderGeometry args={[0.3, 0.3, 0.85, 20]} />
        <meshStandardMaterial {...PAINT_BLUE} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0] - 0.32, 0.58, p[2]]} rotation={[0, 0, Math.PI / 2]} />
        ))}
      </Instances>
      {/* volute casings */}
      <Instances limit={positions.length}>
        <sphereGeometry args={[0.32, 18, 14]} />
        <meshStandardMaterial {...STEEL_MD} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0] + 0.42, 0.5, p[2]]} />
        ))}
      </Instances>
      {/* discharge nozzles */}
      <Instances limit={positions.length}>
        <cylinderGeometry args={[0.09, 0.09, 0.6, 10]} />
        <meshStandardMaterial {...STEEL_LT} />
        {positions.map((p, i) => (
          <Instance key={i} position={[p[0] + 0.42, 0.95, p[2]]} />
        ))}
      </Instances>
    </>
  );
}

function Ladder({ height, position }: { height: number; position: Vec3 }) {
  const rungs = Math.max(2, Math.floor(height / 0.35));
  return (
    <group position={position}>
      {[-0.2, 0.2].map((x, i) => (
        <mesh key={i} position={[x, height / 2, 0]}>
          <cylinderGeometry args={[0.04, 0.04, height, 8]} />
          <meshStandardMaterial {...STEEL_LT} />
        </mesh>
      ))}
      <Instances limit={rungs}>
        <cylinderGeometry args={[0.025, 0.025, 0.42, 6]} />
        <meshStandardMaterial {...STEEL_LT} />
        {Array.from({ length: rungs }).map((_, i) => (
          <Instance key={i} position={[0, 0.25 + i * 0.35, 0]} rotation={[0, 0, Math.PI / 2]} />
        ))}
      </Instances>
    </group>
  );
}

/** Multi-level circular platforms + handrails around the column, with a ladder. */
export function PlatformsAndStairs({
  position = [0, 0, 0],
  radius = 1.55,
  levels = [2.6, 5.0, 7.4],
}: {
  position?: Vec3;
  radius?: number;
  levels?: number[];
}) {
  return (
    <group position={position}>
      {levels.map((y, i) => (
        <group key={i} position={[0, y, 0]}>
          {/* grating annulus */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <ringGeometry args={[radius * 0.96, radius + 0.65, 36]} />
            <meshStandardMaterial {...STEEL_DK} side={THREE.DoubleSide} metalness={0.6} roughness={0.7} />
          </mesh>
          {/* twin handrails */}
          {[0.55, 1.05].map((hy, j) => (
            <mesh key={j} position={[0, hy, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius + 0.6, 0.025, 6, 44]} />
              <meshStandardMaterial {...STEEL_LT} />
            </mesh>
          ))}
        </group>
      ))}
      <Ladder height={levels[levels.length - 1] + 0.4} position={[0, 0, radius + 0.62]} />
    </group>
  );
}
