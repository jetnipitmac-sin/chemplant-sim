"use client";
/**
 * Cement Manufacturing — full end-to-end plant on a Z-spine.
 *
 *   Limestone Crusher (−20,−40) → Raw Mill & Blending Silos (−15,−20)
 *     → Preheater Tower (−10,0) → Rotary Kiln (0,20) → Clinker Cooler (10,40)
 *     → Cement Mill & Finish Silos (25,40);  Baghouse + Stack (−30,0).
 *
 * Solids move in enclosed conveyor galleries; gases move in large ducts.
 * Every group is wrapped in <Equipment> for the hover tooltip; the raw mill,
 * kiln and baghouse/ID-fan are also click-to-adjust units.
 */
import { useSimStore } from "@/store/simStore";
import { FlowBeads } from "../parts3d";
import { Equipment, CementTelemetry } from "./Equipment";
import { ConveyorGallery, Duct } from "./conveyors";
import { StackSmoke } from "./motion";
import { BaghouseStack, CementMillSilos, ClinkerCooler, LimestoneCrusher, PreheaterTower, RawMillSilos, RotaryKiln } from "./units";

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function CementPlantScene() {
  return (
    <group>
      <CementTelemetry />

      {/* ════════ Limestone Crusher (−20, −40) ════════ */}
      <Equipment id="crusher" position={[-20, 0, -40]} hitbox={[6, 6, 5]} hitboxPos={[0, 3, 0]}>
        <LimestoneCrusher />
      </Equipment>

      {/* ════════ Raw Mill & Blending Silos (−15, −20) — unit: cementRawMill ════════ */}
      <Equipment id="rawMill" position={[-15, 0, -20]} unitId="cementRawMill" ring={[2, 0, 0]} hitbox={[10, 9, 5]} hitboxPos={[2, 4.5, 0]}>
        <RawMillSilos />
      </Equipment>

      {/* ════════ Preheater Tower (−10, 0) ════════ */}
      <Equipment id="preheater" position={[-10, 0, 0]} hitbox={[5.5, 19, 5.5]} hitboxPos={[0.5, 9.5, 0]}>
        <PreheaterTower />
      </Equipment>

      {/* ════════ Rotary Kiln (0, 20) — unit: cementKiln ════════ */}
      <Equipment id="kiln" position={[0, 0, 20]} unitId="cementKiln" ring={[0, 0, 0]} hitbox={[3.5, 6, 18]} hitboxPos={[0, 3.5, 0]}>
        <RotaryKiln />
      </Equipment>

      {/* ════════ Clinker Cooler (10, 40) ════════ */}
      <Equipment id="cooler" position={[10, 0, 40]} hitbox={[6, 4, 7.5]} hitboxPos={[0, 2, 0]}>
        <ClinkerCooler />
      </Equipment>

      {/* ════════ Cement Mill & Finish Silos (25, 40) ════════ */}
      <Equipment id="cementMill" position={[25, 0, 40]} hitbox={[14, 12, 5]} hitboxPos={[3, 6, 0]}>
        <CementMillSilos />
      </Equipment>

      {/* ════════ Baghouse & Stack (−30, 0) — unit: cementFan (ID fan / draft) ════════ */}
      <Equipment id="baghouse" position={[-30, 0, 0]} unitId="cementFan" ring={[0, 0, 1]} hitbox={[6, 23, 5]} hitboxPos={[0, 11, 0]}>
        <BaghouseStack />
      </Equipment>

      {/* ── enclosed conveyor galleries (solids) ── */}
      {/* crusher → raw mill */}
      <ConveyorGallery from={[-20, 3.6, -38]} to={[-15, 4.6, -22]} />
      <FlowBeads from={[-20, 3.6, -38]} to={[-15, 4.6, -22]} color="#b9c2cc" speed={1.1} radius={0.12} />
      {/* raw mill → preheater (then up the tower via an elevator) */}
      <ConveyorGallery from={[-12.6, 5.2, -19]} to={[-9.6, 5.2, -2]} />
      <mesh position={[-7.4, 9, 0]} castShadow>
        <boxGeometry args={[0.9, 18, 0.9]} />
        <meshStandardMaterial color="#69757f" metalness={0.7} roughness={0.5} />
      </mesh>
      <FlowBeads from={[-12.6, 5.2, -18]} to={[-9.8, 5.2, -2]} color="#cbd5e1" speed={1.0} radius={0.11} />
      {/* cooler → cement mill */}
      <ConveyorGallery from={[10, 3.6, 40]} to={[21.5, 3.6, 40]} />
      <FlowBeads from={[10, 3.6, 40]} to={[21.5, 3.6, 40]} color="#9aa3ad" speed={1.0} radius={0.12} />

      {/* ── large air / gas ducts ── */}
      {/* preheater base riser → kiln FEED/inlet end (kiln inlet ≈ [0, 4.8, 8]) */}
      <Duct from={[-7.4, 4.7, 1]} to={[0, 4.8, 8.2]} r={0.7} />
      {/* short axial connector seating into the kiln inlet housing */}
      <Duct from={[0, 4.8, 8.2]} to={[0, 4.7, 9.2]} r={0.62} />
      {/* kiln DISCHARGE hood (≈ [0, 3.6, 31]) → clinker cooler */}
      <Duct from={[0, 3.6, 31]} to={[9, 3.0, 37]} r={0.75} color="#6b6258" />
      {/* preheater exhaust → baghouse → stack */}
      <Duct from={[-9, 17.5, 0.5]} to={[-29, 12.5, 0]} r={0.85} color="#5b6470" />

      {/* ── continuous exhaust off the baghouse stack (GPU particle smoke);
            thickens into a dust excursion when the ID-fan draft drops too low ── */}
      <StackSmoke
        position={[-30, 23.5, -1]}
        count={70}
        color="#c2c7cf"
        rise={16}
        spread={2.2}
        baseSize={2.6}
        getDensity={() => 0.4 + clamp((80 - (useSimStore.getState().params.cement.idFanSpeed ?? 85)) / 30, 0, 1) * 0.9}
      />
    </group>
  );
}
