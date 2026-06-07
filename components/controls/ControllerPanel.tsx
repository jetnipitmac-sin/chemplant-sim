"use client";
/**
 * PID control-loop panel. Each loop can be put in **Manual** (operator sets the
 * MV directly via its normal slider) or **Auto** (the controller drives the MV
 * to hold the PV at the setpoint). Shows live PV vs SP, the MV output bar, and
 * tunable Kp/Ki/Kd — so trainees can watch a real first-order-lag loop respond.
 */
import { useTranslation } from "react-i18next";
import { useActiveConfig, useSimStore } from "@/store/simStore";
import type { ControlLoop } from "@/lib/processes";

export function ControllerPanel() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const loops = config.loops ?? [];
  if (loops.length === 0) return null;
  return (
    <section className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{t("common.controllers")}</h3>
          <span className="chip">PID</span>
        </div>
      </div>
      <div className="space-y-2 p-2">
        {loops.map((loop) => (
          <LoopRow key={loop.id} loop={loop} />
        ))}
      </div>
    </section>
  );
}

function LoopRow({ loop }: { loop: ControlLoop }) {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const c = useSimStore((s) => s.controllers[loop.id]);
  const pv = useSimStore((s) => s.outputs[loop.pv] ?? 0);
  const mv = useSimStore((s) => s.params[config.id][loop.mv] ?? 0);
  const setAuto = useSimStore((s) => s.setControllerAuto);
  const setSp = useSimStore((s) => s.setControllerSp);
  const setGains = useSimStore((s) => s.setControllerGains);

  const pvDef = config.outputs.find((o) => o.id === loop.pv);
  const mvDef = config.params.find((p) => p.id === loop.mv);
  if (!c || !pvDef || !mvDef) return null;

  const dec = pvDef.decimals ?? 0;
  const mvPct = ((mv - mvDef.min) / (mvDef.max - mvDef.min)) * 100;
  const onSp = Math.abs(c.sp - pv) < (loop.spMax - loop.spMin) * 0.025;

  return (
    <div className={`rounded-lg border p-2.5 ${c.auto ? "border-ok/40 bg-ok/5" : "border-edge bg-panel-2/40"}`}>
      {/* header: loop name + Manual/Auto */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-ink">{t(`loop.${loop.id}.name`)}</span>
        <div className="flex overflow-hidden rounded-md border border-edge text-[10px] font-medium">
          <button onClick={() => setAuto(loop.id, false)} className={`px-2 py-0.5 transition ${!c.auto ? "bg-brand/20 text-brand" : "text-muted hover:text-ink"}`}>
            {t("common.manual")}
          </button>
          <button onClick={() => setAuto(loop.id, true)} className={`px-2 py-0.5 transition ${c.auto ? "bg-ok/25 text-ok" : "text-muted hover:text-ink"}`}>
            {t("common.auto")}
          </button>
        </div>
      </div>

      {/* PV vs SP */}
      <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
        <span className="text-muted">
          PV{" "}
          <span className="font-mono tabular-nums" style={{ color: onSp ? "#34d399" : "#e6edf5" }}>
            {pv.toFixed(dec)}
          </span>{" "}
          {pvDef.unit}
        </span>
        <span className="text-muted">
          SP <span className="font-mono tabular-nums text-brand">{c.sp.toFixed(dec)}</span> {pvDef.unit}
        </span>
      </div>

      {/* setpoint slider */}
      <input
        type="range"
        className="guided-slider w-full"
        style={{ "--thumb": "#22d3ee" } as React.CSSProperties}
        min={loop.spMin}
        max={loop.spMax}
        step={(loop.spMax - loop.spMin) / 100}
        value={c.sp}
        onChange={(e) => setSp(loop.id, parseFloat(e.target.value))}
        aria-label={`${t(`loop.${loop.id}.name`)} setpoint`}
      />

      {/* MV output bar */}
      <div className="mt-2">
        <div className="mb-0.5 flex items-center justify-between text-[10px] text-muted">
          <span>
            {t("common.output")} → {t(`param.${loop.mv}.label`)}
            {c.auto && <span className="ml-1 rounded bg-ok/20 px-1 text-ok">{t("common.auto")}</span>}
          </span>
          <span className="font-mono tabular-nums text-ink">
            {mv.toFixed(mvDef.decimals ?? 0)} {mvDef.unit}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded bg-panel-3">
          <div className="h-full rounded bg-brand transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(100, mvPct))}%` }} />
        </div>
      </div>

      {/* gain tuning */}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {(["kp", "ki", "kd"] as const).map((g) => (
          <label key={g} className="flex items-center gap-1 rounded border border-edge bg-panel px-1.5 py-0.5 text-[10px]">
            <span className="uppercase text-muted">{g}</span>
            <input
              type="number"
              step={g === "kp" ? 0.1 : 0.01}
              value={c[g]}
              onChange={(e) => setGains(loop.id, { [g]: parseFloat(e.target.value) || 0 })}
              className="w-full min-w-0 bg-transparent font-mono text-[10px] text-ink outline-none"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
