"use client";
/**
 * Oil Refining — Crude Distillation Unit (CDU).
 *
 * Realistic upstream → downstream spine laid out along +Z, organised around a
 * central pipe rack:
 *
 *   Tank Farm (−40,−50) → Crude Pumps (−10,−30) → Desalter (−10,−15)
 *     → Preheat Train (−10,0) → Fired Heater (−10,15) → Distillation Column (−10,35)
 *   Pipe Rack (15, z −40…+45) · Air Coolers (5, y12, 35) · Flare (50,−60)
 *
 * The column is an educational fractionator with EXACTLY 8 side draw-offs at
 * evenly-spaced heights (top → base), each routing down into the pipe rack.
 * Hovering any equipment shows a single HTML tooltip with live (mocked) tags;
 * the column / heater / pumps are also clickable to edit their live setpoints.
 */
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTranslation } from "react-i18next";
import { PAINT_RUST, STEEL, STEEL_DARK } from "../../plant3d/parts";
import { Flame, FlowBeads, SceneLabel } from "../parts3d";
import { useSimStore } from "@/store/simStore";
import { CUT_DEFS } from "@/store/refineryStore";
import { AirCoolers, Desalter, HeatExchangers, PlatformsAndStairs, Pumps } from "./units";
import { CableTrays, PipeRack } from "./infrastructure";
import { FlareStack, TankFarm } from "./environment";
import { Equipment, RefineryTelemetry } from "./Equipment";
import { Plume } from "./effects";

type Vec3 = [number, number, number];

const UP = new THREE.Vector3(0, 1, 0);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

// ── distillation column geometry (module-stable) ──
const R = 1.8;
const SKIRT_H = 1.6;
const SHELL_H = 20;
const BASE_Y = SKIRT_H;
const TOP_Y = BASE_Y + SHELL_H; // dome springs from here
const HEADER_Y = 2.0; // grade-level rundown header
const TRAYS = 12;

// 8 side draws, evenly spaced from near-top → near-base (light → heavy)
const DRAWS = CUT_DEFS.map((c, i) => {
  const yTop = BASE_Y + SHELL_H * 0.93;
  const yBot = BASE_Y + SHELL_H * 0.06;
  return {
    ...c,
    y: yTop - (i * (yTop - yBot)) / (CUT_DEFS.length - 1),
    xDrop: 4.5 + i * 0.45, // stagger the downcomers so they don't overlap
  };
});

/** A straight pipe of arbitrary orientation, from `a` → `b`. */
function Pipe({
  from,
  to,
  r = 0.1,
  color = "#69757f",
}: {
  from: [number, number, number];
  to: [number, number, number];
  r?: number;
  color?: string;
}) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const d = b.clone().sub(a);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  return (
    <mesh position={mid} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, d.length(), 12]} />
      <meshStandardMaterial color={color} metalness={0.72} roughness={0.42} />
    </mesh>
  );
}

/**
 * Strictly orthogonal (90°) pipe run through a list of world waypoints. Each
 * consecutive pair must differ on a single axis → every segment is axis-aligned
 * (never diagonal); rounded elbow caps are dropped at the interior corners.
 */
function OrthoPipe({ points, r = 0.12, color = "#69757f" }: { points: Vec3[]; r?: number; color?: string }) {
  return (
    <group>
      {points.slice(0, -1).map((a, i) => (
        <Pipe key={`s${i}`} from={a} to={points[i + 1]} r={r} color={color} />
      ))}
      {points.slice(1, -1).map((p, i) => (
        <mesh key={`e${i}`} position={p} castShadow>
          <sphereGeometry args={[r * 1.25, 14, 12]} />
          <meshStandardMaterial color={color} metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

// ── Liquid-product tankage at the far (+Z) end of the pipe rack (light → heavy) ──
const TANK_R = 1.9;
const TANK_H = 4.0;
const TANK_TOP = 0.3 + TANK_H; // shell-top y (foundation pad is 0.3 tall)
/** 6 liquid cuts → 6 storage tanks; each product runs the rack on its own level `h`. */
const PRODUCT_TANKS = [
  { cut: 1, x: 22, z: 37, h: 5.4 }, // gasoline
  { cut: 2, x: 28, z: 37, h: 5.8 }, // naphtha
  { cut: 3, x: 34, z: 37, h: 6.2 }, // kerosene
  { cut: 4, x: 22, z: 43, h: 6.6 }, // diesel
  { cut: 5, x: 28, z: 43, h: 7.0 }, // lube oil
  { cut: 6, x: 34, z: 43, h: 7.4 }, // fuel oil
].map((t) => ({ ...t, def: CUT_DEFS[t.cut] }));

/** Product tank farm: 6 small storage tanks, each colour-banded + colour-roofed by its cut. */
function ProductTankFarm() {
  return (
    <group>
      {PRODUCT_TANKS.map(({ x, z, def }) => (
        <group key={def.key} position={[x, 0, z]}>
          {/* foundation pad */}
          <mesh position={[0, 0.15, 0]} receiveShadow>
            <cylinderGeometry args={[TANK_R + 0.45, TANK_R + 0.55, 0.3, 28]} />
            <meshStandardMaterial {...STEEL_DARK} />
          </mesh>
          {/* shell */}
          <mesh position={[0, 0.3 + TANK_H / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[TANK_R, TANK_R, TANK_H, 32]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
          {/* product-coded roof */}
          <mesh position={[0, TANK_TOP + 0.27, 0]} castShadow>
            <cylinderGeometry args={[TANK_R * 0.62, TANK_R, 0.55, 32]} />
            <meshStandardMaterial color={def.color} metalness={0.45} roughness={0.55} />
          </mesh>
          {/* colour band */}
          <mesh position={[0, 0.3 + TANK_H * 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[TANK_R + 0.02, 0.12, 8, 40]} />
            <meshStandardMaterial color={def.color} metalness={0.3} roughness={0.6} />
          </mesh>
          <SceneLabel position={[0, TANK_TOP + 1.5, 0]} title={def.name.split(" / ")[0]} color={def.color} />
        </group>
      ))}
    </group>
  );
}

export function OilRefineryScene() {
  const { t } = useTranslation();
  const furnaceTemp = useSimStore((s) => s.params.oil.oilFurnaceTemp);
  const feedRate = useSimStore((s) => s.params.oil.oilFeedRate);
  const flareValve = useSimStore((s) => s.params.oil.flareValve ?? 0);
  const beadSpeed = feedRate / 150;

  // heat-reactive column flash-zone material (driven by furnace temp)
  const bottomMat = useRef<THREE.MeshStandardMaterial>(null);
  const cool = useRef(new THREE.Color("#3a2a1a"));
  const hot = useRef(new THREE.Color("#ff5a2a"));
  useFrame(() => {
    const T = useSimStore.getState().params.oil.oilFurnaceTemp;
    const heat = clamp((T - 300) / 110, 0, 1);
    const m = bottomMat.current;
    if (m) {
      m.emissive.copy(cool.current).lerp(hot.current, T > 388 ? 1 : heat);
      m.emissiveIntensity = 0.15 + heat * 0.9;
    }
  });

  return (
    <group>
      <RefineryTelemetry />

      {/* ════════ Crude Tank Farm (−40, −50) ════════ */}
      <Equipment id="tankFarm" position={[-40, 0, -50]} hitbox={[26, 8, 22]} hitboxPos={[0, 4, 0]}>
        <TankFarm rows={2} cols={3} spacing={7} />
      </Equipment>
      <SceneLabel position={[-40, 8, -50]} title="Crude Tank Farm" color="#9fd0ff" />

      {/* ════════ Crude Charge Pumps (−10, −30) — live unit: oilFeed ════════ */}
      <Equipment id="crudePumps" position={[-10, 0, -30]} unitId="oilFeed" ring={[0, 0, 0]} hitbox={[8, 1.8, 2.4]} hitboxPos={[0, 0.7, 0]}>
        <Pumps positions={[[-2.6, 0, 0], [-0.9, 0, 0], [0.8, 0, 0], [2.5, 0, 0]]} />
        {/* common suction/discharge header */}
        <Pipe from={[-3.4, 0.95, 0.6]} to={[3.3, 0.95, 0.6]} r={0.12} color="#6b7785" />
      </Equipment>

      {/* ════════ Desalter (−10, −15) — live unit: oilDesalter ════════ */}
      <Equipment id="desalter" position={[-10, 0, -15]} unitId="oilDesalter" ring={[0, 0, 0]} hitbox={[6.2, 4.2, 4]} hitboxPos={[0, 2, 0]}>
        <Desalter />
      </Equipment>
      <SceneLabel position={[-10, 4.2, -15]} title="Desalter" />

      {/* ════════ Preheat Train (−10, 0) ════════ */}
      <Equipment id="heatExchangers" position={[-10, 0, 0]} hitbox={[5, 4.6, 3]} hitboxPos={[0, 2, 0]}>
        <HeatExchangers shells={3} />
      </Equipment>

      {/* ════════ Fired Heater (−10, 15) — live unit: oilHeater ════════ */}
      <Equipment id="firedHeater" position={[-10, 0, 15]} unitId="oilHeater" ring={[0, 0, 0]} hitbox={[5, 7.5, 4.5]} hitboxPos={[0, 3.2, 0]}>
        <mesh position={[0, 2.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 4, 3.2]} />
          <meshStandardMaterial {...PAINT_RUST} />
        </mesh>
        {/* convection section */}
        <mesh position={[0, 4.7, 0]} castShadow>
          <boxGeometry args={[4, 1.2, 3.2]} />
          <meshStandardMaterial {...STEEL_DARK} />
        </mesh>
        {/* peep door */}
        <mesh position={[0, 1.6, 1.61]}>
          <planeGeometry args={[1.4, 1.2]} />
          <meshStandardMaterial color="#1a0f08" />
        </mesh>
        <Flame
          position={[0, 1.6, 0.55]}
          baseScale={1.4}
          getHeat={() => clamp((useSimStore.getState().params.oil.oilFurnaceTemp - 300) / 110, 0, 1)}
          getDanger={() => useSimStore.getState().params.oil.oilFurnaceTemp > 388}
        />
        {/* stack */}
        <mesh position={[1.35, 6.4, 0]} castShadow>
          <cylinderGeometry args={[0.42, 0.5, 4, 20]} />
          <meshStandardMaterial {...STEEL_DARK} />
        </mesh>
      </Equipment>
      <SceneLabel position={[-10, 7.6, 15]} title={t("scene.firedHeater")} sub={`${furnaceTemp.toFixed(0)}°C`} color="#f59e0b" />

      {/* ════════ Distillation Column (−10, 35) — live unit: oilColumn ════════ */}
      <Equipment id="column" position={[-10, 0, 35]} unitId="oilColumn" ring={[0, 0, 0]} hitbox={[4.4, SHELL_H + 2, 4.4]} hitboxPos={[0, (SHELL_H + 2) / 2, 0]}>
        {/* skirt */}
        <mesh position={[0, SKIRT_H / 2, 0]} castShadow>
          <cylinderGeometry args={[R * 0.92, R, SKIRT_H, 32]} />
          <meshStandardMaterial {...STEEL_DARK} />
        </mesh>
        {/* upper shell */}
        <mesh position={[0, BASE_Y + SHELL_H * 0.22 + (SHELL_H * 0.78) / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[R, R, SHELL_H * 0.78, 48]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        {/* heat-reactive flash zone (lower shell) */}
        <mesh position={[0, BASE_Y + (SHELL_H * 0.22) / 2, 0]} castShadow>
          <cylinderGeometry args={[R, R, SHELL_H * 0.22, 48]} />
          <meshStandardMaterial ref={bottomMat} color="#9aa7b4" metalness={0.7} roughness={0.4} emissive="#3a2a1a" emissiveIntensity={0.2} />
        </mesh>
        {/* top dome */}
        <mesh position={[0, TOP_Y, 0]} castShadow>
          <sphereGeometry args={[R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        {/* tray rings */}
        {Array.from({ length: TRAYS }).map((_, i) => (
          <mesh key={i} position={[0, BASE_Y + SHELL_H * ((i + 0.5) / TRAYS), 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[R * 1.02, 0.04, 8, 40]} />
            <meshStandardMaterial {...STEEL_DARK} />
          </mesh>
        ))}

        {/* multi-level access platforms + ladder */}
        <PlatformsAndStairs position={[0, 0, 0]} radius={R + 0.4} levels={[4.5, 9, 13.5, 18]} />

        {/* ── 8 side draw-offs → downcomers → grade rundown header → rack ── */}
        {DRAWS.map((d) => (
          <group key={d.key}>
            <Pipe from={[R, d.y, 0]} to={[R + 0.5, d.y, 0]} r={0.14} color="#8a96a3" />
            <Pipe from={[R + 0.5, d.y, 0]} to={[d.xDrop, d.y, 0]} r={0.11} color={d.color} />
            <mesh position={[d.xDrop, d.y, 0]} castShadow>
              <sphereGeometry args={[0.15, 12, 10]} />
              <meshStandardMaterial color={d.color} metalness={0.55} roughness={0.45} />
            </mesh>
            <Pipe from={[d.xDrop, d.y, 0]} to={[d.xDrop, HEADER_Y, 0]} r={0.11} color={d.color} />
            <FlowBeads from={[R + 0.5, d.y, 0]} to={[d.xDrop, d.y, 0]} color={d.color} speed={beadSpeed} radius={0.08} count={2} />
          </group>
        ))}
        {/* grade rundown header running into the pipe rack (local x25 = world x15) */}
        <Pipe from={[4.0, HEADER_Y, 0]} to={[25, HEADER_Y, 0]} r={0.16} color="#6b7785" />
        <FlowBeads from={[4.5, HEADER_Y, 0]} to={[24, HEADER_Y, 0]} color="#d9a441" speed={beadSpeed} radius={0.1} count={4} />

        {/* overhead vapour line → air coolers (local x15 = world x5) */}
        <Pipe from={[0, TOP_Y + 0.3, 0]} to={[15, 12.8, 0]} r={0.16} color="#8a96a3" />
        <FlowBeads from={[0, TOP_Y + 0.3, 0]} to={[15, 12.8, 0]} color={CUT_DEFS[0].color} speed={beadSpeed} radius={0.1} count={3} />
      </Equipment>
      <SceneLabel position={[-10, TOP_Y + 1.4, 35]} title={t("scene.tower")} sub={`${furnaceTemp.toFixed(0)}°C`} color="#f59e0b" />

      {/* ════════ Overhead Air Coolers (5, y12, 35) — live unit: oilAirCooler ════════ */}
      <Equipment id="airCoolers" position={[5, 0, 35]} unitId="oilAirCooler" ring={[0, 0, 0]} hitbox={[8, 14, 4]} hitboxPos={[0, 7, 0]}>
        {/* elevated support structure to grade */}
        {[
          [-3.3, 1.3],
          [3.3, 1.3],
          [-3.3, -1.3],
          [3.3, -1.3],
        ].map((c, i) => (
          <mesh key={i} position={[c[0], 3.5, c[1]]} castShadow>
            <boxGeometry args={[0.26, 7, 0.26]} />
            <meshStandardMaterial {...STEEL_DARK} />
          </mesh>
        ))}
        <mesh position={[0, 7, 0]} castShadow receiveShadow>
          <boxGeometry args={[7.4, 0.3, 3.2]} />
          <meshStandardMaterial {...STEEL_DARK} />
        </mesh>
        <AirCoolers position={[0, 7, 0]} bays={3} />
      </Equipment>
      <SceneLabel position={[5, 14, 35]} title="Overhead Air Coolers" color="#9fd0ff" />

      {/* ════════ Central Pipe Rack (15, z −40…+45) + cable trays ════════ */}
      <PipeRack position={[15, 0, 2.5]} length={85} width={5} height={7} bents={22} />
      <CableTrays position={[17.8, 0, 2.5]} length={85} />

      {/* ════════ Flare Stack (50, −60) — live unit: oilFlare ════════ */}
      <Equipment id="flareStack" position={[50, 0, -60]} unitId="oilFlare" ring={[0, 0, 0]} hitbox={[4.5, 38, 4.5]} hitboxPos={[0, 19, 0]}>
        <FlareStack height={36} getBoost={() => (useSimStore.getState().params.oil.flareValve ?? 0) / 100} />
      </Equipment>
      <SceneLabel position={[50, 14, -60]} title="Flare Stack" color="#ff9d5c" />

      {/* ── crude feed spine (pumps → desalter → preheat → heater → column) ── */}
      <Pipe from={[-8.6, 0.85, -28.5]} to={[-8.6, 0.85, 14]} r={0.18} color="#5c6772" />
      <FlowBeads from={[-8.6, 0.85, -28]} to={[-8.6, 0.85, -16]} color="#8a5a3a" speed={beadSpeed} radius={0.1} />
      <FlowBeads from={[-8.6, 0.85, -14]} to={[-8.6, 0.85, -1]} color="#8a5a3a" speed={beadSpeed} radius={0.1} />
      <FlowBeads from={[-8.6, 0.85, 1]} to={[-8.6, 0.85, 13]} color="#c2703a" speed={beadSpeed} radius={0.1} />
      {/* hot feed line: heater → column flash zone */}
      <Pipe from={[-8.6, 4.0, 16]} to={[-8.6, 4.0, 33]} r={0.16} color="#9e6b3a" />
      <Pipe from={[-8.6, 4.0, 33]} to={[-10 + R, 3.6, 35]} r={0.16} color="#9e6b3a" />
      <FlowBeads from={[-8.6, 4.0, 17]} to={[-8.6, 4.0, 33]} color="#fb923c" speed={beadSpeed} radius={0.1} />

      {/* ══════════ Orthogonal (90°) plant headers — no diagonals ══════════ */}
      {/* Flare header: pipe-rack end → straight X → 90° → straight Z → flare base */}
      <OrthoPipe points={[[15, 5, 45], [50, 5, 45], [50, 5, -60], [50, 0.5, -60]]} r={0.34} color="#d9a441" />
      {/* purge/relief flow only when the emergency flare valve is opened */}
      <FlowBeads from={[50, 5, 44]} to={[50, 5, -58]} color="#ffae57" speed={flareValve / 25} radius={0.18} count={4} />

      {/* Crude transfer line: tank farm → straight X → 90° → pumps → straight X → rack */}
      <OrthoPipe points={[[-40, 1, -50], [-10, 1, -50], [-10, 1, -30], [15, 1, -30]]} r={0.26} color="#8a96a3" />
      <FlowBeads from={[-39, 1, -50]} to={[-11, 1, -50]} color="#8a5a3a" speed={beadSpeed} radius={0.13} count={4} />

      {/* ══════════ Mission-matched consequence effects (param-driven) ══════════ */}
      {/* Cracking Crisis → sooty smoke off the fired-heater stack as the furnace overheats */}
      <Plume
        position={[-8.65, 9, 15]}
        color="#6b5f52"
        count={12}
        rise={13}
        spread={1.5}
        size={1.4}
        speed={0.32}
        getIntensity={() => clamp((useSimStore.getState().params.oil.oilFurnaceTemp - 378) / 22, 0, 1)}
      />
      {/* Condenser Failure → white vapour venting off the column top as overhead pressure climbs */}
      <Plume
        position={[-10, TOP_Y + 1, 35]}
        color="#d4e4f0"
        count={12}
        rise={11}
        spread={1.4}
        size={1.4}
        speed={0.42}
        getIntensity={() => clamp(1 - (useSimStore.getState().params.oil.airCoolerRpm ?? 1200) / 900, 0, 1)}
      />
      {/* Cold Charge → heavy dark haze around the cold flash zone when vaporization is starved */}
      <Plume
        position={[-10, 4, 35]}
        color="#57422f"
        count={11}
        rise={7}
        spread={1.7}
        size={1.5}
        speed={0.22}
        getIntensity={() => {
          const p = useSimStore.getState().params.oil;
          const eff = p.oilFeedRate * ((p.crudePumpSpeed ?? 80) / 80);
          return clamp(1 - (p.oilFurnaceTemp - 300) / Math.max(eff * 0.38, 1), 0, 1);
        }}
      />

      {/* ══════════ Product Tank Farm (far +Z end of the rack) — APPENDED ══════════ */}
      {/* New tankage that receives the colour-coded product lines which previously stopped on the rack. */}
      <ProductTankFarm />
      {/* Extend each product line orthogonally from the existing rundown-header terminus on the rack
          ([15, 2, 35]): riser → run along the rack at its own level → 90° out over the tank → 90° down in. */}
      {PRODUCT_TANKS.map(({ x, z, h, def }) => (
        <group key={def.key}>
          <OrthoPipe points={[[15, 2, 35], [15, h, 35], [15, h, z], [x, h, z], [x, TANK_TOP, z]]} r={0.12} color={def.color} />
          <FlowBeads from={[15, h, z]} to={[x, h, z]} color={def.color} speed={beadSpeed} radius={0.09} count={2} />
        </group>
      ))}
      <SceneLabel position={[28, TANK_TOP + 4.4, 40]} title="Product Tank Farm" color="#9fd0ff" />
    </group>
  );
}
