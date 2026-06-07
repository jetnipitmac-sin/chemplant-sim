"use client";
import { SceneCanvas } from "./SceneCanvas";
import { OilRefineryScene } from "./refinery/OilRefineryScene";
import { RefineryTooltip } from "./refinery/RefineryTooltip";

/** Oil Refining — pulled-back establishing shot of the full CDU spine. */
export function RefineryScene() {
  return (
    <div className="relative h-full w-full">
      <SceneCanvas camera={[40, 48, 110]} target={[0, 8, -14]} fog={[100, 520]} far={800} maxDistance={340}>
        <OilRefineryScene />
      </SceneCanvas>
      {/* single HTML hover tooltip, rendered outside the canvas */}
      <RefineryTooltip />
    </div>
  );
}
