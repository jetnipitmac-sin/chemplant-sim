"use client";
/** End-to-end cement plant equipment (built around local origin; placed by <Equipment>). */
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useSimStore } from "@/store/simStore";
import { Flame } from "../parts3d";
import { CONCRETE, CONCRETE_LT, STEEL_DK, STEEL_LT, STEEL_MD } from "../refinery/materials";

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
/** live burning-zone temperature (from the model output, or recomputed from the sliders). */
const kilnTemp = () => {
  const p = useSimStore.getState().params.cement;
  const o = useSimStore.getState().outputs;
  return (o.cementBurnTemp as number) ?? 1450 + 18 * ((p.burnerFuelRate ?? 12) - 12) - 0.9 * ((p.rawFeedRate ?? 250) - 250) - 1.6 * ((p.idFanSpeed ?? 85) - 85);
};

/** Limestone crusher — heavy structural block, feed hopper, incoming rock. */
export function LimestoneCrusher() {
  return (
    <group>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[5, 3, 4]} />
        <meshStandardMaterial {...CONCRETE} />
      </mesh>
      <mesh position={[0, 3.7, 0]} castShadow>
        <boxGeometry args={[3.4, 1.9, 3]} />
        <meshStandardMaterial {...STEEL_MD} />
      </mesh>
      {/* feed hopper */}
      <mesh position={[0, 5.1, 0]} castShadow>
        <cylinderGeometry args={[1.7, 0.9, 1.5, 4]} />
        <meshStandardMaterial {...STEEL_DK} />
      </mesh>
      {/* incoming limestone pile */}
      {[
        [-2.6, 0.5, 1.3, 0.7],
        [-3.1, 0.42, 0.1, 0.55],
        [-2.3, 0.48, -1.2, 0.62],
        [-3.3, 0.4, -0.9, 0.5],
      ].map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]} rotation={[i, i * 2, i]} castShadow>
          <icosahedronGeometry args={[p[3], 0]} />
          <meshStandardMaterial color="#6b6258" roughness={1} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

/** Raw mill + blending silos — grinding building with massive vertical cylinders. */
export function RawMillSilos() {
  return (
    <group>
      <mesh position={[-2, 2.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 4.2, 3.6]} />
        <meshStandardMaterial {...STEEL_MD} />
      </mesh>
      {[2.4, 5.8].map((x, i) => (
        <group key={i} position={[x, 0, 0]}>
          <mesh position={[0, 4.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.8, 1.8, 8.4, 32]} />
            <meshStandardMaterial {...CONCRETE_LT} />
          </mesh>
          <mesh position={[0, 8.6, 0]} castShadow>
            <cylinderGeometry args={[1.8, 1.25, 0.7, 32]} />
            <meshStandardMaterial {...CONCRETE} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Preheater tower — very tall concrete frame with stacked cyclones. */
export function PreheaterTower() {
  const H = 19;
  return (
    <group>
      {[
        [-1.7, -1.7],
        [1.7, -1.7],
        [-1.7, 1.7],
        [1.7, 1.7],
      ].map((c, i) => (
        <mesh key={i} position={[c[0], H / 2, c[1]]} castShadow>
          <boxGeometry args={[0.42, H, 0.42]} />
          <meshStandardMaterial {...CONCRETE_LT} />
        </mesh>
      ))}
      {[4, 8, 12, 16].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} receiveShadow castShadow>
          <boxGeometry args={[4, 0.28, 4]} />
          <meshStandardMaterial {...CONCRETE} />
        </mesh>
      ))}
      {/* stacked cyclones down the front face */}
      {[16, 12.3, 8.6, 4.9].map((y, i) => (
        <group key={i} position={[2.6, y, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[1.1, 1.1, 1.6, 28]} />
            <meshStandardMaterial {...STEEL_MD} />
          </mesh>
          <mesh position={[0, -1.45, 0]} castShadow>
            <coneGeometry args={[1.1, 1.7, 28]} />
            <meshStandardMaterial {...STEEL_MD} />
          </mesh>
        </group>
      ))}
      {/* riser duct */}
      <mesh position={[2.6, H / 2, 1.5]} castShadow>
        <cylinderGeometry args={[0.42, 0.42, H, 16]} />
        <meshStandardMaterial {...STEEL_DK} />
      </mesh>
    </group>
  );
}

/** Rotary kiln — long, slender, inclined cylinder on 3 tyre/roller stations with a
 *  girth-gear drive, firing hood + feed housing, and a glowing refractory burning zone. */
export function RotaryKiln() {
  const spin = useRef<THREE.Group>(null);
  const pinion = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null); // discharge hood
  const hot = useRef<THREE.MeshStandardMaterial>(null); // refractory burning-zone sleeve
  const dim = useRef(new THREE.Color("#2a1208"));
  const orange = useRef(new THREE.Color("#ff7a1a"));
  const white = useRef(new THREE.Color("#ffe2b0"));
  useFrame((_, dt) => {
    // live rotation — directly linked to the kilnSpeed slider (faster slider → faster spin)
    const N = useSimStore.getState().params.cement.kilnSpeed ?? 3.5;
    if (spin.current) spin.current.rotation.z += dt * (N / 2.4);
    if (pinion.current) pinion.current.rotation.z -= dt * (N / 2.4) * 4.5; // small gear spins faster
    const heat = clamp((kilnTemp() - 1300) / 280, 0, 1);
    for (const m of [glow.current, hot.current]) {
      if (!m) continue;
      m.emissive.copy(dim.current).lerp(orange.current, Math.min(1, heat * 1.55)).lerp(white.current, Math.max(0, heat - 0.55) * 2.4);
      m.emissiveIntensity = 0.3 + heat * 1.9;
    }
  });

  const L = 22;
  const r = 0.95; // slender shell → realistic ~11:1 length/diameter
  const cy = 4.3;
  const tilt = 0.055; // ≈ 3.1° incline, discharge (+Z) end lower
  const tyres = [-7.5, 0, 7]; // three riding-ring / support stations
  const disq = L / 2; // discharge end (+Z)

  return (
    <group>
      {/* concrete support piers */}
      {tyres.map((z, i) => (
        <mesh key={i} position={[0, (cy - 1.2) / 2, z]} castShadow receiveShadow>
          <boxGeometry args={[3.2, cy - 1.0, 1.5]} />
          <meshStandardMaterial {...CONCRETE} />
        </mesh>
      ))}
      {/* twin support rollers under each tyre */}
      {tyres.map((z) =>
        [-0.78, 0.78].map((rx, j) => (
          <mesh key={`${z}-${j}`} position={[rx, cy - r - 0.18, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 1.4, 20]} />
            <meshStandardMaterial color="#717a85" metalness={0.85} roughness={0.35} />
          </mesh>
        )),
      )}

      {/* feed-end housing (inlet / riser to the preheater), −Z high end */}
      <mesh position={[0, cy, -disq - 1]} rotation={[tilt, 0, 0]} castShadow>
        <boxGeometry args={[2.8, 2.8, 2]} />
        <meshStandardMaterial {...STEEL_DK} />
      </mesh>

      {/* girth-gear pinion + drive motor (static structure beside the gear band) */}
      <group position={[0, cy - r - 0.55, 1.5]}>
        <mesh ref={pinion} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.5, 16]} />
          <meshStandardMaterial color="#9aa2ac" metalness={0.9} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.7, 0]} castShadow>
          <boxGeometry args={[1.1, 1.0, 1.8]} />
          <meshStandardMaterial {...CONCRETE} />
        </mesh>
      </group>

      {/* tilted kiln assembly */}
      <group position={[0, cy, 0]} rotation={[tilt, 0, 0]}>
        <group ref={spin}>
          {/* shell */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[r, r, L, 48]} />
            <meshStandardMaterial color="#5b6470" metalness={0.7} roughness={0.55} />
          </mesh>
          {/* thick riding rings (tyres) over the supports */}
          {tyres.map((z, i) => (
            <mesh key={i} position={[0, 0, z]} castShadow>
              <torusGeometry args={[r + 0.18, 0.22, 16, 40]} />
              <meshStandardMaterial {...STEEL_LT} />
            </mesh>
          ))}
          {/* girth-gear drive band (toothed look via a chunky low-segment torus) */}
          <mesh position={[0, 0, 1.5]} castShadow>
            <torusGeometry args={[r + 0.16, 0.17, 8, 64]} />
            <meshStandardMaterial color="#8a929c" metalness={0.92} roughness={0.28} />
          </mesh>
          {/* stiffener bands */}
          {[-3.6, 4.2].map((z, i) => (
            <mesh key={i} position={[0, 0, z]} castShadow>
              <torusGeometry args={[r + 0.05, 0.07, 12, 36]} />
              <meshStandardMaterial {...STEEL_DK} />
            </mesh>
          ))}
        </group>

        {/* glowing refractory burning zone — a static incandescent sleeve over the discharge third */}
        <mesh position={[0, 0, disq - 3.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 1.04, r * 1.04, 6, 48, 1, true]} />
          <meshStandardMaterial ref={hot} color="#5b2a14" emissive="#3a1a0a" emissiveIntensity={0.4} metalness={0.3} roughness={0.7} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>

        {/* discharge firing hood */}
        <mesh position={[0, 0, disq + 1.1]} castShadow>
          <boxGeometry args={[2.9, 2.9, 2.4]} />
          <meshStandardMaterial {...STEEL_MD} />
        </mesh>
        {/* hood throat (glows with the burning-zone temp) */}
        <mesh position={[0, 0, disq + 0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 1.05, r * 1.05, 1.4, 48]} />
          <meshStandardMaterial ref={glow} color="#4a4a52" metalness={0.55} roughness={0.6} emissive="#3a1a0a" emissiveIntensity={0.3} />
        </mesh>
        {/* burner pipe through the hood */}
        <mesh position={[0, 0, disq + 2.6]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.22, 2.6, 16]} />
          <meshStandardMaterial {...STEEL_DK} />
        </mesh>
        {/* main flame firing back up into the kiln from the hot end */}
        <group position={[0, 0, disq - 1.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <Flame position={[0, 0, 0]} baseScale={1.7} getHeat={() => clamp((kilnTemp() - 1300) / 250, 0, 1)} getDanger={() => kilnTemp() > 1545} />
        </group>
      </group>
    </group>
  );
}

/** Clinker cooler — long low housing with spinning undergrate cooling fans. */
export function ClinkerCooler() {
  const fans = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    fans.current?.children.forEach((f) => {
      f.rotation.y += dt * 3.2;
    });
  });
  return (
    <group>
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 2.4, 7]} />
        <meshStandardMaterial color="#3a4654" metalness={0.5} roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.65, 0]} castShadow>
        <boxGeometry args={[3.6, 0.5, 6.4]} />
        <meshStandardMaterial {...STEEL_DK} />
      </mesh>
      {/* undergrate cooling fans */}
      <group ref={fans}>
        {[-2.2, 0, 2.2].map((z, i) => (
          <group key={i} position={[2.7, 0.4, z]}>
            <mesh>
              <cylinderGeometry args={[0.7, 0.7, 0.3, 20]} />
              <meshStandardMaterial {...STEEL_DK} />
            </mesh>
            {[0, 1, 2, 3].map((b) => (
              <mesh key={b} rotation={[0, (b * Math.PI) / 2, 0]} position={[0, 0.05, 0]}>
                <boxGeometry args={[1.3, 0.04, 0.22]} />
                <meshStandardMaterial {...STEEL_LT} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

/** Cement (finish) mill — horizontal ball mill leading to tall finish silos. */
export function CementMillSilos() {
  const spin = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.x += dt * 0.9;
  });
  return (
    <group>
      {/* horizontal ball mill (axis along X) */}
      <group position={[-3.5, 1.7, 0]}>
        <mesh ref={spin} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[1.35, 1.35, 5, 40]} />
          <meshStandardMaterial color="#525a64" metalness={0.6} roughness={0.6} />
        </mesh>
        {[-2.1, 2.1].map((x, i) => (
          <mesh key={i} position={[x, -1.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 1.3, 2.6]} />
            <meshStandardMaterial {...CONCRETE} />
          </mesh>
        ))}
      </group>
      {/* finish silos */}
      {[2.5, 5.6, 8.7].map((x, i) => (
        <group key={i} position={[x, 0, 0.5]}>
          <mesh position={[0, 5.2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.55, 1.55, 10.4, 32]} />
            <meshStandardMaterial {...CONCRETE_LT} />
          </mesh>
          <mesh position={[0, 10.6, 0]} castShadow>
            <cylinderGeometry args={[1.55, 1.05, 0.6, 32]} />
            <meshStandardMaterial {...CONCRETE} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Baghouse dust collector + tall exhaust stack. */
export function BaghouseStack() {
  return (
    <group>
      {/* filter house */}
      <mesh position={[0, 3, 2]} castShadow receiveShadow>
        <boxGeometry args={[5, 6, 4]} />
        <meshStandardMaterial {...STEEL_MD} />
      </mesh>
      {/* bag compartments on the roof */}
      {[-1.5, -0.5, 0.5, 1.5].flatMap((x) =>
        [1, 3].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 6.4, z]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.9, 12]} />
            <meshStandardMaterial {...STEEL_DK} />
          </mesh>
        )),
      )}
      {/* tall exhaust stack */}
      <mesh position={[0, 11.5, -1]} castShadow>
        <cylinderGeometry args={[0.9, 1.25, 23, 28]} />
        <meshStandardMaterial color="#6b6f76" metalness={0.3} roughness={0.85} />
      </mesh>
      {[18, 20.5].map((y, i) => (
        <mesh key={i} position={[0, y, -1]}>
          <cylinderGeometry args={[0.93, 0.93, 1.1, 28]} />
          <meshStandardMaterial color="#b14a3a" metalness={0.3} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}
