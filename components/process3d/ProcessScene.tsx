"use client";
/** Swaps the 3D model to match the active process. Loaded browser-only (ssr:false)
 *  by the page so all WebGL stays client-side. */
import { useActiveProcessId } from "@/store/simStore";
import { RefineryScene } from "./RefineryScene";
import { CementScene } from "./CementScene";
import { BoilerScene } from "./BoilerScene";
import { GasPlantScene } from "./GasPlantScene";
import PlantView from "../plant3d/PlantView";

export default function ProcessScene() {
  const id = useActiveProcessId();
  if (id === "oil") return <RefineryScene />;
  if (id === "cement") return <CementScene />;
  if (id === "boiler") return <BoilerScene />;
  if (id === "gsp") return <GasPlantScene />;
  return <PlantView />;
}
