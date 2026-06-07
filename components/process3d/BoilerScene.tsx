"use client";
/**
 * Power Boiler / steam plant — water-tube boiler with live, sim-driven visuals:
 *   • burner flame scales with the firing rate
 *   • the steam-drum sight glass tracks the live drum level
 *   • water-wall tubes glow with furnace heat
 *   • the turbine rotor spins at the live steam flow
 *   • stack smoke thickens with firing / poor combustion
 * Every group is wrapped in <BoilerEquipment> for the hover tooltip; the furnace,
 * feedwater pump and turbine are also click-to-select units.
 */
import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Instance, Instances } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import { SceneCanvas } from "./SceneCanvas";
import { Flame, FlowBeads, SceneLabel } from "./parts3d";
import { StackSmoke } from "./cement/motion";
import { BoilerTooltip } from "./BoilerTooltip";
import { CONCRETE, STEEL_DK, STEEL_LT, STEEL_MD } from "./refinery/materials";
import { useSimStore } from "@/store/simStore";
import { BoilerEquipId, useBoilerHover } from "@/store/boilerStore";

type Vec3 = [number, number, number];
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const flameHeat = () => clamp((useSimStore.getState().params.boiler.boilerFuelRate - 2) / 9, 0, 1);
const flameDanger = () => (useSimStore.getState().outputs.boilerSteamP ?? 0) > 118 || (useSimStore.getState().outputs.boilerNOx ?? 0) > 480;

// ── orthogonal connecting-pipe helpers (added for the process tie-ins; equipment untouched) ──
const UP = new THREE.Vector3(0, 1, 0);
/** A straight pipe from `a` → `b`. */
function Pipe({ from, to, r = 0.14, color = "#69757f" }: { from: Vec3; to: Vec3; r?: number; color?: string }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const d = b.clone().sub(a);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d.clone().normalize());
  return (
    <mesh position={mid} quaternion={q} castShadow>
      <cylinderGeometry args={[r, r, d.length() || 0.001, 16]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.42} />
    </mesh>
  );
}
/** Strictly orthogonal (90°) run through waypoints (each pair differs on one axis) + elbow caps. */
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
function BoilerEquipment({
  id,
  unitId,
  ring,
  hit,
  hitPos = [0, 0, 0],
  children,
}: {
  id: BoilerEquipId;
  unitId?: string;
  ring?: Vec3;
  hit?: Vec3;
  hitPos?: Vec3;
  children: React.ReactNode;
}) {
  const setHovered = useBoilerHover((s) => s.setHovered);
  const clearHovered = useBoilerHover((s) => s.clearHovered);
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
      onClick={
        unitId
          ? (e) => {
              e.stopPropagation();
              setSelected(unitId);
            }
          : undefined
      }
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
          <torusGeometry args={[2.2, 0.08, 16, 64]} />
          <meshStandardMaterial color="#fb923c" emissive="#fb923c" emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function BoilerModel() {
  const { t } = useTranslation();
  const water = useRef<THREE.Mesh>(null);
  const wall = useRef<THREE.MeshStandardMaterial>(null);
  const rotor = useRef<THREE.Group>(null);
  const cool = useRef(new THREE.Color("#241007"));
  const hotC = useRef(new THREE.Color("#ff5a1e"));

  useFrame((_, dt) => {
    const s = useSimStore.getState();
    const level = s.outputs.boilerDrumLevel ?? 50;
    const heat = clamp((s.params.boiler.boilerFuelRate - 2) / 9, 0, 1);
    const steam = s.outputs.boilerSteamFlow ?? 90;
    if (water.current) {
      const h = clamp(level / 100, 0.03, 1) * 1.8;
      water.current.scale.y = h;
      water.current.position.y = 8.55 + h / 2;
    }
    if (wall.current) {
      wall.current.emissive.copy(cool.current).lerp(hotC.current, heat);
      wall.current.emissiveIntensity = 0.12 + heat * 0.95;
    }
    if (rotor.current) rotor.current.rotation.x += dt * (steam / 26);
  });

  const tubes = Array.from({ length: 13 }, (_, i) => -1.85 + (i / 12) * 3.7);

  return (
    <group>
      {/* ───────── Furnace + burners + superheater (unit: boilerBurner) ───────── */}
      <BoilerEquipment id="furnace" unitId="boilerBurner" ring={[0, 0, 0]} hit={[4.4, 8, 4.4]} hitPos={[0, 5, 0]}>
        <mesh position={[0, 5, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 8, 4]} />
          <meshStandardMaterial {...STEEL_DK} />
        </mesh>
        <Instances limit={tubes.length} position={[0, 5, 2.02]}>
          <cylinderGeometry args={[0.11, 0.11, 7.4, 10]} />
          <meshStandardMaterial ref={wall} color="#6b7480" metalness={0.6} roughness={0.5} emissive="#241007" emissiveIntensity={0.2} />
          {tubes.map((x, i) => (
            <Instance key={i} position={[x, 0, 0]} />
          ))}
        </Instances>
        <mesh position={[0, 2.2, 2.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.7, 0.8, 20]} />
          <meshStandardMaterial color="#1a0f08" metalness={0.4} roughness={0.8} />
        </mesh>
        <group position={[0, 2.6, 0.9]} rotation={[-Math.PI / 2, 0, 0]}>
          <Flame position={[0, 0, 0]} baseScale={1.7} getHeat={flameHeat} getDanger={flameDanger} />
        </group>
      </BoilerEquipment>

      {/* ───────── Steam drum + circulation + sight glass ───────── */}
      <BoilerEquipment id="steamDrum" hit={[3, 2.8, 6.8]} hitPos={[0, 9.7, 0]}>
        <mesh position={[0, 9.6, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[1.2, 1.2, 6, 32]} />
          <meshStandardMaterial {...STEEL_LT} />
        </mesh>
        {[3, -3].map((z, i) => (
          <mesh key={i} position={[0, 9.6, z]} rotation={[z > 0 ? -Math.PI / 2 : Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[1.2, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial {...STEEL_LT} />
          </mesh>
        ))}
        <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 4, 24]} />
          <meshStandardMaterial {...STEEL_MD} />
        </mesh>
        {[2.2, -2.2].map((x, i) => (
          <mesh key={i} position={[x, 5, -1.4]} castShadow>
            <cylinderGeometry args={[0.28, 0.28, 8.5, 16]} />
            <meshStandardMaterial {...STEEL_MD} />
          </mesh>
        ))}
        {/* sight glass + live water column */}
        <mesh position={[1.45, 9.5, 1.1]}>
          <cylinderGeometry args={[0.16, 0.16, 2.0, 12]} />
          <meshStandardMaterial color="#aee3ff" metalness={0.1} roughness={0.1} transparent opacity={0.32} />
        </mesh>
        <mesh ref={water} position={[1.45, 9.0, 1.1]}>
          <cylinderGeometry args={[0.13, 0.13, 1, 12]} />
          <meshStandardMaterial color="#2f9fe0" emissive="#1d6fb0" emissiveIntensity={0.4} />
        </mesh>
      </BoilerEquipment>

      {/* steam line drum → turbine (connector) */}
      <mesh position={[1.6, 10.6, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 1.4, 14]} />
        <meshStandardMaterial {...STEEL_LT} />
      </mesh>
      <FlowBeads from={[2.2, 10.8, 0]} to={[7.4, 5.2, 0]} color="#e2e8f0" speed={(useSimStore.getState().outputs.boilerSteamFlow ?? 90) / 90} radius={0.12} />

      {/* ───────── Turbine + generator (unit: boilerTurbine) ───────── */}
      <BoilerEquipment id="turbine" unitId="boilerTurbine" ring={[8, 0, 0]} hit={[6, 4, 3]} hitPos={[8, 4.6, 0]}>
        <group position={[8, 4.6, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[1.0, 1.4, 3, 28]} />
            <meshStandardMaterial {...STEEL_MD} />
          </mesh>
          <group ref={rotor}>
            {[0, 1, 2, 3, 4, 5].map((b) => (
              <mesh key={b} rotation={[(b * Math.PI) / 3, 0, 0]}>
                <boxGeometry args={[2.6, 1.7, 0.08]} />
                <meshStandardMaterial {...STEEL_LT} />
              </mesh>
            ))}
          </group>
          <mesh position={[2.6, 0, 0]} castShadow>
            <boxGeometry args={[2, 1.6, 1.6]} />
            <meshStandardMaterial color="#2f6f9e" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, -1.5, 0]} receiveShadow>
            <boxGeometry args={[5.2, 0.4, 2.2]} />
            <meshStandardMaterial {...CONCRETE} />
          </mesh>
        </group>
      </BoilerEquipment>

      {/* ───────── Feedwater pump (unit: boilerFeedwater) ───────── */}
      <BoilerEquipment id="feedwater" unitId="boilerFeedwater" ring={[-5.5, 0, 2.5]} hit={[3, 2, 2]} hitPos={[-5.5, 0.9, 2.5]}>
        <group position={[-5.5, 0, 2.5]}>
          <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 0.3, 1.2]} />
            <meshStandardMaterial {...CONCRETE} />
          </mesh>
          <mesh position={[-0.5, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.4, 0.4, 1.2, 20]} />
            <meshStandardMaterial color="#2f6f9e" metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0.6, 0.8, 0]} castShadow>
            <sphereGeometry args={[0.42, 18, 14]} />
            <meshStandardMaterial {...STEEL_MD} />
          </mesh>
        </group>
        <FlowBeads from={[-4.4, 0.9, 2.5]} to={[-0.7, 0.8, 0]} color="#38bdf8" speed={(useSimStore.getState().params.boiler.feedwaterFlow ?? 95) / 95} radius={0.1} />
      </BoilerEquipment>

      {/* ───────── Economizer + stack + smoke ───────── */}
      <BoilerEquipment id="stack" hit={[2.6, 13, 2.6]} hitPos={[5.2, 9.5, -1.6]}>
        <mesh position={[5.2, 4, -1.6]} castShadow>
          <boxGeometry args={[1.8, 3, 1.8]} />
          <meshStandardMaterial {...STEEL_DK} />
        </mesh>
        <mesh position={[5.2, 10, -1.6]} castShadow>
          <cylinderGeometry args={[0.7, 0.85, 11, 28]} />
          <meshStandardMaterial color="#6b6f76" metalness={0.3} roughness={0.85} />
        </mesh>
        {[14.5, 15.2].map((y, i) => (
          <mesh key={i} position={[5.2, y, -1.6]}>
            <cylinderGeometry args={[0.73, 0.73, 0.5, 28]} />
            <meshStandardMaterial color="#b14a3a" metalness={0.3} roughness={0.8} />
          </mesh>
        ))}
        <StackSmoke
          position={[5.2, 15.8, -1.6]}
          count={64}
          color="#c2c7cf"
          rise={14}
          spread={2}
          baseSize={2.4}
          getDensity={() => {
            const s = useSimStore.getState();
            const f = (s.params.boiler.boilerFuelRate ?? 7) / 9;
            const sooty = clamp((10 - (s.params.boiler.boilerAirFlow ?? 18)) / 8, 0, 1);
            return 0.3 + f * 0.5 + sooty * 0.7;
          }}
        />
      </BoilerEquipment>

      {/* ══════════ Process tie-in piping (ADDED — strictly orthogonal 90° runs) ══════════ */}
      {/* 1 · Feedwater line (blue): feedwater-pump discharge → riser → into the steam-drum top */}
      <OrthoPipe points={[[-4.9, 0.9, 2.5], [-4.9, 10.8, 2.5], [0, 10.8, 2.5], [0, 10.0, 2.5]]} r={0.16} color="#38bdf8" />
      <FlowBeads from={[-4.9, 1.4, 2.5]} to={[-4.9, 10.6, 2.5]} color="#38bdf8" speed={(useSimStore.getState().params.boiler.feedwaterFlow ?? 95) / 95} radius={0.11} count={3} />

      {/* 2 · Main steam line (red): steam-drum top → over the boiler → down into the turbine inlet */}
      <OrthoPipe points={[[1.6, 11.3, 0], [1.6, 12.3, 0], [7.2, 12.3, 0], [7.2, 6.0, 0]]} r={0.18} color="#f87171" />
      <FlowBeads from={[2.2, 12.3, 0]} to={[7.0, 12.3, 0]} color="#fca5a5" speed={(useSimStore.getState().outputs.boilerSteamFlow ?? 90) / 90} radius={0.12} count={3} />

      {/* 3 · Flue-gas duct (thick, sooty grey-brown): furnace exhaust/back → base of the stack (economizer) */}
      <OrthoPipe points={[[1.6, 8.3, -2], [1.6, 8.3, -2.5], [5.2, 8.3, -2.5], [5.2, 4.5, -2.5]]} r={0.42} color="#463d34" />
      <FlowBeads from={[2.2, 8.3, -2.5]} to={[5.0, 8.3, -2.5]} color="#7a7066" speed={(useSimStore.getState().params.boiler.boilerFuelRate ?? 7) / 7} radius={0.16} count={2} />

      {/* labels */}
      <SceneLabel position={[0, 9.6, 1.7]} title={t("scene.steamDrum")} color="#fb7185" />
      <SceneLabel position={[0, 0.2, 2.4]} title={t("scene.furnace")} />
      <SceneLabel position={[8, 6.6, 0]} title={t("scene.turbine")} color="#38bdf8" />
      <SceneLabel position={[-5.5, 1.7, 2.5]} title={t("scene.feedwater")} />
      <SceneLabel position={[5.2, 16.4, -1.6]} title={t("scene.stack")} />
    </group>
  );
}

/** Power Boiler view (3D + single HTML hover tooltip). */
export function BoilerScene() {
  return (
    <div className="relative h-full w-full">
      <SceneCanvas camera={[15, 11, 18]} target={[1, 6, 0]} fog={[40, 180]} far={400} maxDistance={120}>
        <BoilerModel />
      </SceneCanvas>
      <BoilerTooltip />
    </div>
  );
}
