"use client";
/** Simulation DVR: Play/Pause + Fast-forward (1× / 2× / 5×) + Reset.
 *  Drives the global sim clock (sampler + scenario) and the live CSTR worker. */
import { useTranslation } from "react-i18next";
import { useActiveConfig, useSimStore } from "@/store/simStore";
import { useSimulationStore } from "@/store/simulationStore";

const SPEEDS = [1, 2, 5];

export function DvrControls() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const running = useSimStore((s) => s.running);
  const speed = useSimStore((s) => s.speed);
  const toggle = useSimStore((s) => s.toggleRunning);
  const setSpeed = useSimStore((s) => s.setSpeed);
  const clearHistory = useSimStore((s) => s.clearHistory);

  const reset = () => {
    clearHistory();
    if (config.live) useSimulationStore.getState().requestReset();
  };

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={toggle} className={`btn px-2.5 ${running ? "" : "btn-primary"}`} title={running ? t("common.pause") : t("common.run")}>
        {running ? "⏸" : "▶"}
      </button>
      <div className="flex overflow-hidden rounded-lg border border-edge">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-2 py-1.5 text-xs transition ${speed === s ? "bg-brand/20 text-brand" : "text-muted hover:bg-panel-3"}`}
          >
            {s}×
          </button>
        ))}
      </div>
      <button onClick={reset} className="btn px-2" title={t("common.reset")}>
        ⟳
      </button>
    </div>
  );
}
