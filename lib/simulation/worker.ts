/// <reference lib="webworker" />
/**
 * Simulation Web Worker.
 *
 * Runs the PlantSimulator off the main thread on a fixed real-time cadence and
 * streams immutable snapshots back to the UI. Operator control changes arrive as
 * messages and are applied to the live model without interrupting integration.
 */
import { PlantSimulator } from "./engine";
import type { ControlInputs, WorkerInbound, WorkerOutbound } from "./types";

const TICK_MS = 200; // real-time cadence of snapshots
const SIM_MIN_PER_TICK = 0.2; // process-minutes advanced per tick at speed = 1×

let sim: PlantSimulator | null = null;
let controls: ControlInputs | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(msg: WorkerOutbound) {
  ctx.postMessage(msg);
}

function tick() {
  if (!sim || !controls) return;
  if (controls.running) {
    sim.step(SIM_MIN_PER_TICK * controls.speed);
  }
  post({ type: "snapshot", snapshot: sim.snapshot() });
}

ctx.onmessage = (e: MessageEvent<WorkerInbound>) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      controls = msg.controls;
      sim = new PlantSimulator(controls);
      post({ type: "snapshot", snapshot: sim.snapshot() });
      if (!timer) timer = setInterval(tick, TICK_MS);
      break;
    case "control":
      controls = { ...(controls ?? msg.controls), ...msg.controls } as ControlInputs;
      sim?.setControls(controls);
      break;
    case "reset":
      sim?.reset();
      if (sim) post({ type: "snapshot", snapshot: sim.snapshot() });
      break;
  }
};

export {}; // mark as a module
