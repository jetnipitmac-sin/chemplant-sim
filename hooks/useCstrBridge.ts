"use client";
/**
 * Bridges the educational store → the legacy CSTR ODE worker.
 *
 * Runs the worker for the whole session and streams the CSTR guided-slider values
 * into the worker's control inputs, so the live 3D plant + KPIs respond in real
 * time while the rest of the app stays config-driven.
 */
import { useEffect } from "react";
import { useSimulationEngine } from "./useSimulationEngine";
import { useSimStore } from "@/store/simStore";
import { useSimulationStore } from "@/store/simulationStore";
import { CSTR_CONTROL_MAP } from "@/lib/processes";
import type { ControlInputs } from "@/lib/simulation/types";

export function useCstrBridge() {
  useSimulationEngine();
  useEffect(() => {
    const apply = (p: Record<string, number>) => {
      const controls: Record<string, number> = {};
      for (const [paramId, controlKey] of Object.entries(CSTR_CONTROL_MAP)) {
        const v = p[paramId];
        if (v !== undefined) controls[controlKey] = v;
      }
      useSimulationStore.getState().updateControls(controls as Partial<ControlInputs>);
    };
    apply(useSimStore.getState().params.cstr);
    const unsubParams = useSimStore.subscribe((s) => s.params.cstr, apply);

    // DVR transport (play/pause/speed) → legacy worker controls.
    const applyDvr = () => {
      const { running, speed } = useSimStore.getState();
      useSimulationStore.getState().updateControls({ running, speed });
    };
    applyDvr();
    const unsubRun = useSimStore.subscribe((s) => s.running, applyDvr);
    const unsubSpeed = useSimStore.subscribe((s) => s.speed, applyDvr);

    // Clicking a unit in the CSTR 3D plant (legacy selectedEquipment) selects the matching unit.
    const EQUIP_UNIT: Record<string, string> = {
      "R-101": "cstrReactor",
      "T-101": "cstrFeed",
      "P-101": "cstrFeed",
      "C-101": "cstrColumn",
      "D-101": "cstrColumn",
      "D-102": "cstrColumn",
    };
    const unsubSel = useSimulationStore.subscribe(
      (s) => s.selectedEquipment,
      (eq) => {
        if (eq && EQUIP_UNIT[eq]) useSimStore.getState().setSelectedUnit(EQUIP_UNIT[eq]);
      },
    );

    return () => {
      unsubParams();
      unsubSel();
      unsubRun();
      unsubSpeed();
    };
  }, []);
}
