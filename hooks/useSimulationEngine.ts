"use client";
/**
 * Owns the simulation runtime for the lifetime of the app.
 *
 * Primary path: a dedicated Web Worker (off-main-thread integration). If the
 * environment can't construct a worker, it transparently falls back to a
 * main-thread interval driving the same PlantSimulator — so the dashboards are
 * always live. Mount this exactly once, near the top of the client tree.
 */
import { useEffect } from "react";
import { useSimulationStore } from "@/store/simulationStore";
import { PlantSimulator } from "@/lib/simulation/engine";
import type { WorkerOutbound } from "@/lib/simulation/types";

const TICK_MS = 200;
const SIM_MIN_PER_TICK = 0.2;

export function useSimulationEngine() {
  useEffect(() => {
    const store = useSimulationStore;
    const cleanups: Array<() => void> = [];

    // ---- primary: Web Worker ----
    try {
      const worker = new Worker(new URL("../lib/simulation/worker.ts", import.meta.url));
      worker.onmessage = (e: MessageEvent<WorkerOutbound>) => {
        if (e.data.type === "snapshot") store.getState().applySnapshot(e.data.snapshot);
      };
      worker.postMessage({ type: "init", controls: store.getState().controls });

      const unsubControls = store.subscribe(
        (s) => s.controls,
        (controls) => worker.postMessage({ type: "control", controls }),
      );
      const unsubReset = store.subscribe(
        (s) => s.resetNonce,
        () => worker.postMessage({ type: "reset" }),
      );

      cleanups.push(unsubControls, unsubReset, () => worker.terminate());
      return () => cleanups.forEach((fn) => fn());
    } catch (err) {
      // ---- fallback: main thread ----
      console.warn("[sim] Web Worker unavailable, running on main thread.", err);
      const sim = new PlantSimulator(store.getState().controls);
      const timer = setInterval(() => {
        const c = store.getState().controls;
        sim.setControls(c);
        if (c.running) sim.step(SIM_MIN_PER_TICK * c.speed);
        store.getState().applySnapshot(sim.snapshot());
      }, TICK_MS);

      let lastNonce = store.getState().resetNonce;
      const unsubReset = store.subscribe(
        (s) => s.resetNonce,
        (nonce) => {
          if (nonce !== lastNonce) {
            lastNonce = nonce;
            sim.reset();
          }
        },
      );
      cleanups.push(unsubReset, () => clearInterval(timer));
      return () => cleanups.forEach((fn) => fn());
    }
  }, []);
}
