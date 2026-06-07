"use client";
import { SceneCanvas } from "./SceneCanvas";
import { CementPlantScene } from "./cement/CementPlantScene";
import { CementTooltip } from "./cement/CementTooltip";

/** Cement Manufacturing — pulled-back establishing shot of the full end-to-end plant. */
export function CementScene() {
  return (
    <div className="relative h-full w-full">
      <SceneCanvas camera={[52, 46, 96]} target={[-2, 7, 0]} fog={[110, 540]} far={820} maxDistance={360}>
        <CementPlantScene />
      </SceneCanvas>
      {/* single HTML hover tooltip, rendered outside the canvas */}
      <CementTooltip />
    </div>
  );
}
