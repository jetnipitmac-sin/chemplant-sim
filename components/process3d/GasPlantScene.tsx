"use client";
/**
 * Natural Gas Separation Plant (GSP) — cryogenic NGL recovery.
 *
 * Realistic upstream → downstream train laid out around a central PIPE RACK that
 * runs along z = 0 (x: −45 → 70). Every connecting line is strictly orthogonal
 * (90° turns only) and routed through the rack — never diagonal:
 *
 *   Slug Catcher (−40,−20) → Amine Tower (−25,+20) → Dehydration (−10,−20)
 *     → Cold Box & Turbo-Expander (5,+20)               ……… thick GAS HEADER
 *   Cold Box → Demethanizer (20) → Deethanizer (35)
 *     → Depropanizer (50) → Debutanizer (65)  (all z=−20) ……… amber NGL HEADER
 *
 * Live, sim-driven visuals: header flow beads track the raw-gas feed, the cold
 * box vents cryogenic vapour with the expander ΔP, the turbo-expander rotor
 * spins, and the amine regenerator vents acid gas with the CO₂ slip. Every unit
 * is wrapped in <GspEquipment> for the hover tooltip; the slug catcher, amine
 * tower, cold box and demethanizer are also click-to-select setpoint units.
 */
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import { SceneCanvas } from "./SceneCanvas";
import { FlowBeads, SceneLabel } from "./parts3d";
import { StackSmoke } from "./cement/motion";
import { GasPlantTooltip } from "./GasPlantTooltip";
import { CONCRETE, CONCRETE_LT, PAINT_BLUE, STEEL_DK, STEEL_LT, STEEL_MD, TANK } from "./refinery/materials";
import { useSimStore } from "@/store/simStore";
import { GspEquipId, useGspHover } from "@/store/gspStore";

type Vec3 = [number, number, number];
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

const COLD = { color: "#9fc4d6", metalness: 0.45, roughness: 0.5 } as const; // frosted cryo box

/** A straight pipe from `a` → `b` (any orientation). */
function Pipe({ from, to, r = 0.12, color = "#69757f" }: { from: Vec3; to: Vec3; r?: number; color?: string }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const d = b.clone().sub(a);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  return (
    <mesh position={mid} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, d.length() || 0.01, 12]} />
      <meshStandardMaterial color={color} metalness={0.72} roughness={0.42} />
    </mesh>
  );
}

/**
 * Strictly orthogonal (90°) pipe run through world waypoints. Each consecutive
 * pair must differ on a single axis → every segment is axis-aligned (never
 * diagonal); rounded elbow caps are dropped at the interior corners.
 */
function OrthoPipe({ points, r = 0.14, color = "#6b8594" }: { points: Vec3[]; r?: number; color?: string }) {
  return (
    <group>
      {points.slice(0, -1).map((a, i) => (
        <Pipe key={`s${i}`} from={a} to={points[i + 1]} r={r} color={color} />
      ))}
      {points.slice(1, -1).map((p, i) => (
        <mesh key={`e${i}`} position={p} castShadow>
          <sphereGeometry args={[r * 1.3, 14, 12]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

/** Hover (→ tooltip) + optional click-to-select wrapper for one piece of equipment. */
function GspEquipment({
  id,
  unitId,
  ring,
  hit,
  hitPos = [0, 0, 0],
  children,
}: {
  id: GspEquipId;
  unitId?: string;
  ring?: Vec3;
  hit?: Vec3;
  hitPos?: Vec3;
  children: React.ReactNode;
}) {
  const setHovered = useGspHover((s) => s.setHovered);
  const clearHovered = useGspHover((s) => s.clearHovered);
  const setSelected = useSimStore((s) => s.setSelectedUnit);
  const selected = useSimStore((s) => (unitId ? s.selectedUnitId === unitId : false));
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const sc = 1 + 0.06 * Math.sin(clock.elapsedTime * 4);
      ringRef.current.scale.set(sc, sc, 1);
    }
  });
  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(id);
        document.body.style.cursor = unitId ? "pointer" : "help";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        clearHovered(id);
        document.body.style.cursor = "auto";
      }}
      onClick={unitId ? (e) => { e.stopPropagation(); setSelected(unitId); } : undefined}
    >
      {hit && (
        <mesh position={hitPos}>
          <boxGeometry args={hit} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {children}
      {selected && ring && (
        <mesh ref={ringRef} position={[ring[0], 0.06, ring[2]]} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3, 0.1, 16, 64]} />
          <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

type Mat = { color: string; metalness: number; roughness: number };

/** Reusable vertical column (skirt + shell + dished top + platform rings). */
function Column({ h, r, color = STEEL_LT, rings = 3 }: { h: number; r: number; color?: Mat; rings?: number }) {
  return (
    <group>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[r * 1.05, r * 1.12, 1.6, 22]} />
        <meshStandardMaterial {...CONCRETE} />
      </mesh>
      <mesh position={[0, 1.6 + h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 30]} />
        <meshStandardMaterial {...color} />
      </mesh>
      <mesh position={[0, 1.6 + h, 0]} castShadow>
        <sphereGeometry args={[r, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...color} />
      </mesh>
      {Array.from({ length: rings }, (_, i) => {
        const y = 1.6 + (h * (i + 1)) / (rings + 1);
        return (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r + 0.25, 0.05, 8, 36]} />
            <meshStandardMaterial {...STEEL_DK} />
          </mesh>
        );
      })}
      {/* ladder */}
      <mesh position={[r + 0.2, 1.6 + h / 2, 0]}>
        <boxGeometry args={[0.06, h, 0.5]} />
        <meshStandardMaterial {...STEEL_DK} />
      </mesh>
    </group>
  );
}

/** Central pipe rack along z = 0, x −45 → 70: bents (posts + transverse beams) + 4 longitudinal beams. */
function PipeRack() {
  const xs = Array.from({ length: 15 }, (_, i) => -44 + i * 8); // bents every 8 m
  return (
    <group>
      {/* longitudinal beams: 2 decks (y 5 & 8) × 2 sides (z ±2) */}
      {[5, 8].flatMap((y) =>
        [-2, 2].map((z) => (
          <mesh key={`l${y}-${z}`} position={[12.5, y, z]} castShadow>
            <boxGeometry args={[115, 0.28, 0.28]} />
            <meshStandardMaterial {...STEEL_DK} />
          </mesh>
        )),
      )}
      {/* posts (2 per bent) */}
      <Instances limit={xs.length * 2} castShadow>
        <cylinderGeometry args={[0.22, 0.22, 8.4, 10]} />
        <meshStandardMaterial {...STEEL_DK} />
        {xs.flatMap((x) => [-2, 2].map((z) => <Instance key={`${x}-${z}`} position={[x, 4.2, z]} />))}
      </Instances>
      {/* transverse beams (2 per bent, y 5 & 8) */}
      <Instances limit={xs.length * 2}>
        <boxGeometry args={[0.26, 0.26, 4.4]} />
        <meshStandardMaterial {...STEEL_DK} />
        {xs.flatMap((x) => [5, 8].map((y) => <Instance key={`${x}-${y}`} position={[x, y, 0]} />))}
      </Instances>
    </group>
  );
}

/** Spinning turbo-expander / recompressor rotor (rate ∝ compression power). */
function ExpanderRotor() {
  const rotor = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (rotor.current) rotor.current.rotation.x += dt * clamp((useSimStore.getState().outputs.gspCompPower ?? 10) / 4, 0.4, 8);
  });
  return (
    <group ref={rotor}>
      {[0, 1, 2, 3, 4, 5].map((b) => (
        <mesh key={b} rotation={[(b * Math.PI) / 3, 0, 0]}>
          <boxGeometry args={[1.4, 0.9, 0.06]} />
          <meshStandardMaterial {...STEEL_LT} />
        </mesh>
      ))}
    </group>
  );
}

function GasPlantModel() {
  const { t } = useTranslation();
  const feed = useSimStore((s) => s.params.gsp.rawGasFeed ?? 400);
  const c2 = useSimStore((s) => s.outputs.gspC2Recovery ?? 80);
  const gasSpeed = clamp(feed / 400, 0.15, 2.2);
  const nglSpeed = clamp((c2 / 85) * (feed / 400), 0.1, 2);

  const pad: Vec3[] = [
    [-40, 0.1, -20],
    [-25, 0.1, 20],
    [-10, 0.1, -20],
    [6, 0.1, 20],
  ];

  return (
    <group>
      <PipeRack />

      {/* concrete foundations */}
      {pad.map((p, i) => (
        <mesh key={i} position={p} receiveShadow>
          <boxGeometry args={[16, 0.2, 14]} />
          <meshStandardMaterial {...CONCRETE} />
        </mesh>
      ))}
      <mesh position={[42, 0.1, -20]} receiveShadow>
        <boxGeometry args={[64, 0.2, 12]} />
        <meshStandardMaterial {...CONCRETE} />
      </mesh>

      {/* ════════ Slug Catcher (−40, −20) — horizontal bullet tanks ════════ */}
      <GspEquipment id="slugCatcher" unitId="gspSlugCatcher" ring={[-40, 0, -20]} hit={[15, 7, 11]} hitPos={[-40, 3.2, -20]}>
        {[-3.6, 0, 3.6].map((dz, i) => (
          <group key={i} position={[-40, 3.2, -20 + dz]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[1.45, 1.45, 12, 24]} />
              <meshStandardMaterial {...TANK} />
            </mesh>
            {[-6, 6].map((dx, j) => (
              <mesh key={j} position={[dx, 0, 0]} rotation={[0, 0, dx > 0 ? -Math.PI / 2 : Math.PI / 2]} castShadow>
                <sphereGeometry args={[1.45, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial {...TANK} />
              </mesh>
            ))}
            {[-4, 4].map((dx, j) => (
              <mesh key={`s${j}`} position={[dx, -1.9, 0]}>
                <boxGeometry args={[0.7, 1.7, 2.6]} />
                <meshStandardMaterial {...CONCRETE_LT} />
              </mesh>
            ))}
          </group>
        ))}
      </GspEquipment>

      {/* ════════ Amine Tower / AGRU (−25, +20) — absorber + regenerator + acid-gas vent ════════ */}
      <GspEquipment id="amineTower" unitId="gspAmine" ring={[-25, 0, 20]} hit={[12, 26, 9]} hitPos={[-23, 12, 20]}>
        <group position={[-26, 0, 20]}>
          <Column h={22} r={2} color={STEEL_LT} rings={4} />
          {/* overhead KO drum */}
          <mesh position={[0, 25.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.9, 0.9, 2.6, 20]} />
            <meshStandardMaterial {...STEEL_MD} />
          </mesh>
        </group>
        {/* regenerator (shorter) + acid-gas vent stack */}
        <group position={[-20, 0, 22]}>
          <Column h={14} r={1.4} color={STEEL_MD} rings={3} />
          <mesh position={[0, 17.5, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.5, 5, 18]} />
            <meshStandardMaterial color="#6b6f76" metalness={0.3} roughness={0.85} />
          </mesh>
        </group>
        <StackSmoke
          position={[-20, 20.4, 22]}
          count={34}
          color="#b7bcc6"
          rise={9}
          spread={1.8}
          baseSize={1.7}
          getDensity={() => clamp(((useSimStore.getState().outputs.gspCO2Slip ?? 15) - 8) / 90, 0.05, 0.95)}
        />
      </GspEquipment>

      {/* ════════ Dehydration Beds (−10, −20) — 3 molecular-sieve cylinders ════════ */}
      <GspEquipment id="dehydration" ring={[-10, 0, -20]} hit={[10, 11, 6]} hitPos={[-10, 5, -20]}>
        {[-3, 0, 3].map((dx, i) => (
          <group key={i} position={[-10 + dx, 0, -20]}>
            <mesh position={[0, 0.7, 0]}>
              <cylinderGeometry args={[1.25, 1.32, 1.4, 18]} />
              <meshStandardMaterial {...CONCRETE} />
            </mesh>
            <mesh position={[0, 5, 0]} castShadow>
              <cylinderGeometry args={[1.2, 1.2, 7, 24]} />
              <meshStandardMaterial {...STEEL_MD} />
            </mesh>
            {[1.5, 8.5].map((y, j) => (
              <mesh key={j} position={[0, y, 0]} rotation={[j ? 0 : Math.PI, 0, 0]} castShadow>
                <sphereGeometry args={[1.2, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial {...STEEL_MD} />
              </mesh>
            ))}
          </group>
        ))}
        {/* inlet/outlet manifold tying the 3 beds */}
        <OrthoPipe points={[[-13, 9.3, -20], [-7, 9.3, -20]]} r={0.16} color="#6b8594" />
        <OrthoPipe points={[[-13, 1.1, -20], [-7, 1.1, -20]]} r={0.16} color="#6b8594" />
      </GspEquipment>

      {/* ════════ Cold Box & Turbo-Expander (5, +20) — dense structural box ════════ */}
      <GspEquipment id="coldBox" unitId="gspColdBox" ring={[5, 0, 20]} hit={[13, 17, 8]} hitPos={[6, 8.5, 20]}>
        {/* insulated cold box */}
        <mesh position={[5, 8, 20]} castShadow receiveShadow>
          <boxGeometry args={[5, 14, 5]} />
          <meshStandardMaterial {...COLD} />
        </mesh>
        {/* corner structural framing */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} position={[5 + sx * 2.6, 8, 20 + sz * 2.6]}>
              <boxGeometry args={[0.18, 15, 0.18]} />
              <meshStandardMaterial {...STEEL_DK} />
            </mesh>
          )),
        )}
        {[3, 8, 13].map((y) => (
          <mesh key={y} position={[5, y, 20]}>
            <boxGeometry args={[5.4, 0.16, 5.4]} />
            <meshStandardMaterial {...STEEL_DK} />
          </mesh>
        ))}
        {/* turbo-expander / recompressor skid */}
        <group position={[10.5, 1.6, 20]}>
          <mesh position={[0, 0.2, 0]} receiveShadow>
            <boxGeometry args={[5, 0.4, 3]} />
            <meshStandardMaterial {...CONCRETE_LT} />
          </mesh>
          <mesh position={[-0.8, 1.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.9, 1.1, 2.4, 24]} />
            <meshStandardMaterial {...PAINT_BLUE} />
          </mesh>
          <group position={[0.9, 1.1, 0]}>
            <ExpanderRotor />
          </group>
          <mesh position={[1.9, 1.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.7, 0.9, 1.8, 22]} />
            <meshStandardMaterial {...STEEL_MD} />
          </mesh>
        </group>
        {/* cryogenic vapour vent */}
        <StackSmoke
          position={[5, 15.4, 20]}
          count={30}
          color="#cfe8f5"
          rise={6}
          spread={1.6}
          baseSize={1.7}
          getDensity={() => clamp(((useSimStore.getState().params.gsp.expanderPressureDrop ?? 25) - 8) / 34, 0.08, 0.7)}
        />
      </GspEquipment>

      {/* ════════ Fractionation Train (z=−20): Demethanizer → Deethanizer → Depropanizer → Debutanizer ════════ */}
      {([
        { id: "demethanizer" as const, unitId: "gspDemethanizer", x: 20, h: 22, r: 1.6 },
        { id: "deethanizer" as const, x: 35, h: 20, r: 1.5 },
        { id: "depropanizer" as const, x: 50, h: 18, r: 1.45 },
        { id: "debutanizer" as const, x: 65, h: 16, r: 1.4 },
      ]).map((col) => (
        <GspEquipment
          key={col.id}
          id={col.id}
          unitId={col.unitId}
          ring={[col.x, 0, -20]}
          hit={[col.r * 2 + 2.4, col.h + 6, col.r * 2 + 2.4]}
          hitPos={[col.x, (col.h + 4) / 2, -20]}
        >
          <group position={[col.x, 0, -20]}>
            <Column h={col.h} r={col.r} color={STEEL_LT} rings={3} />
            {/* overhead condenser drum on a small platform */}
            <mesh position={[0, col.h + 4.4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[col.r * 0.55, col.r * 0.55, col.r * 2.1, 18]} />
              <meshStandardMaterial {...STEEL_MD} />
            </mesh>
            {/* base reboiler (horizontal kettle) */}
            <mesh position={[col.r + 1.4, 2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.85, 0.85, 3, 18]} />
              <meshStandardMaterial {...STEEL_MD} />
            </mesh>
          </group>
        </GspEquipment>
      ))}

      {/* ════════════════ GAS HEADER (thick) — Slug → Amine → Dehy → Cold Box ════════════════ */}
      {/* seg A: slug catcher → amine absorber inlet (low) */}
      <OrthoPipe points={[[-40, 4.6, -20], [-40, 8, -20], [-40, 8, 0], [-26, 8, 0], [-26, 8, 20], [-26, 5, 20]]} r={0.4} color="#6b8594" />
      {/* seg B: amine sweet-gas overhead → dehydration (high cross-over) */}
      <OrthoPipe points={[[-26, 23.4, 20], [-26, 24.2, 20], [-26, 24.2, 0], [-10, 24.2, 0], [-10, 24.2, -20], [-10, 9.3, -20]]} r={0.38} color="#6b8594" />
      {/* seg C: dehydration dry gas → cold box inlet */}
      <OrthoPipe points={[[-10, 9.3, -20], [-10, 8, -20], [-10, 8, 0], [5, 8, 0], [5, 8, 20], [5, 12, 20]]} r={0.4} color="#6b8594" />

      {/* ════════════════ NGL HEADER (amber) — Cold Box → fractionation train ════════════════ */}
      {/* seg D: cold box NGL bottoms → demethanizer feed */}
      <OrthoPipe points={[[5, 3, 20], [5, 3, 0], [20, 3, 0], [20, 3, -20], [20, 5, -20]]} r={0.26} color="#d9a441" />
      {/* sequential bottoms transfers along the train (toward camera, low) */}
      <OrthoPipe points={[[20, 2.6, -18.4], [35, 2.6, -18.4], [35, 4.5, -18.4]]} r={0.24} color="#d9a441" />
      <OrthoPipe points={[[35, 2.6, -18.4], [50, 2.6, -18.4], [50, 4.5, -18.4]]} r={0.24} color="#d9a441" />
      <OrthoPipe points={[[50, 2.6, -18.4], [65, 2.6, -18.4], [65, 4.5, -18.4]]} r={0.24} color="#d9a441" />

      {/* ════════════════ OVERHEAD PRODUCT EXPORT — each column overhead → pipe rack → export edge (x 80) ════════════════ */}
      {/* colour-coded, parallel product lines on stacked rack levels: Sales Gas C₁ (yellow) · Ethane C₂ (green) · Propane C₃ (blue) · Butane C₄ (purple).
          Each leaves its column's overhead drum (`top`), rises to its own rack level (`rail`), turns onto the rack at z=0 and runs east to the battery-limit export edge. */}
      {([
        { key: "gspSalesGas", x: 20, top: 26.4, rail: 28.0, color: "#fde047", r: 0.3 },
        { key: "gspEthane", x: 35, top: 24.4, rail: 27.0, color: "#4ade80", r: 0.24 },
        { key: "gspPropane", x: 50, top: 22.4, rail: 26.0, color: "#60a5fa", r: 0.24 },
        { key: "gspButane", x: 65, top: 20.4, rail: 25.0, color: "#c084fc", r: 0.24 },
      ] as const).map((pr) => (
        <group key={pr.key}>
          {/* overhead drum → riser up to its rack level → turn onto the rack → run east to the export edge */}
          <OrthoPipe points={[[pr.x, pr.top, -20], [pr.x, pr.rail, -20], [pr.x, pr.rail, 0], [80, pr.rail, 0]]} r={pr.r} color={pr.color} />
          {/* live product flow leaving the plant */}
          <FlowBeads from={[pr.x + 4, pr.rail, 0]} to={[78, pr.rail, 0]} color={pr.color} speed={gasSpeed} radius={0.12} count={3} />
          <SceneLabel position={[80, pr.rail, 0]} title={t(`output.${pr.key}.label`)} sub="▸ export" color={pr.color} />
        </group>
      ))}

      {/* export pipe-bridge support at the battery limit (carries the elevated product lines past the rack) */}
      <group>
        {[-1.6, 1.6].map((z, i) => (
          <mesh key={i} position={[76, 14.5, z]} castShadow>
            <cylinderGeometry args={[0.2, 0.2, 29, 10]} />
            <meshStandardMaterial {...STEEL_DK} />
          </mesh>
        ))}
        {[24.6, 28.4].map((y, i) => (
          <mesh key={i} position={[76, y, 0]}>
            <boxGeometry args={[0.22, 0.22, 3.6]} />
            <meshStandardMaterial {...STEEL_DK} />
          </mesh>
        ))}
      </group>

      {/* ════════ live flow beads (feed train) ════════ */}
      <FlowBeads from={[-40, 8, 0]} to={[-26, 8, 0]} color="#2dd4bf" speed={gasSpeed} radius={0.16} count={3} />
      <FlowBeads from={[-10, 8, 0]} to={[5, 8, 0]} color="#2dd4bf" speed={gasSpeed} radius={0.16} count={3} />
      <FlowBeads from={[5, 3, 0]} to={[20, 3, 0]} color="#f4c069" speed={nglSpeed} radius={0.13} count={3} />

      {/* ════════ nameplates ════════ */}
      <SceneLabel position={[-40, 6.4, -20]} title={t("scene.slugCatcher")} sub="SC-101" color="#2dd4bf" />
      <SceneLabel position={[-26, 27.4, 20]} title={t("scene.amineTower")} sub="T-201" color="#2dd4bf" />
      <SceneLabel position={[-10, 11.6, -20]} title={t("scene.dehydration")} sub="V-301" />
      <SceneLabel position={[7, 17.4, 20]} title={t("scene.coldBox")} sub="E-401" color="#9fc4d6" />
      <SceneLabel position={[20, 28.6, -20]} title={t("scene.demethanizer")} sub="C-501" color="#2dd4bf" />
      <SceneLabel position={[35, 26.4, -20]} title={t("scene.deethanizer")} sub="C-502" />
      <SceneLabel position={[50, 24.4, -20]} title={t("scene.depropanizer")} sub="C-503" />
      <SceneLabel position={[65, 22.4, -20]} title={t("scene.debutanizer")} sub="C-504" />
      <SceneLabel position={[58, 8.6, 0]} title={t("scene.pipeRack")} />
    </group>
  );
}

/** Gas Separation Plant view (3D + single HTML hover tooltip). */
export function GasPlantScene() {
  return (
    <div className="relative h-full w-full">
      <SceneCanvas camera={[26, 52, 104]} target={[12, 7, -2]} fog={[130, 600]} far={900} maxDistance={380}>
        <GasPlantModel />
      </SceneCanvas>
      <GasPlantTooltip />
    </div>
  );
}
