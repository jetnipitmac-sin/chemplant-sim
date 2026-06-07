"use client";
/**
 * Guided interactive slider.
 *  • Renders the recommended ("optimal") range as a green band on the track.
 *  • Colours the thumb + value badge by severity (optimal / warning / danger).
 *  • An info button reveals a layman-friendly explanation of the parameter.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { paramSeverity, type ParamDef } from "@/lib/processes";
import { FormulaHint } from "./FormulaHint";

const SEV = {
  optimal: { thumb: "#34d399", badge: "border-ok/40 bg-ok/10 text-ok" },
  warning: { thumb: "#f59e0b", badge: "border-warn/40 bg-warn/10 text-warn" },
  danger: { thumb: "#ef4444", badge: "border-crit/40 bg-crit/10 text-crit" },
} as const;

function InfoButton({ paramId }: { paramId: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid h-4 w-4 place-items-center rounded-full border border-edge text-[10px] font-semibold text-muted transition hover:border-brand hover:text-brand"
        aria-label={t("common.info")}
        title={t("common.info")}
      >
        i
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-6 z-50 w-64 -translate-x-1/2 animate-fade-in rounded-lg border border-edge bg-panel-2 p-3 text-xs leading-relaxed text-ink/90 shadow-panel">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand">{t("common.info")}</span>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label={t("common.close")}>
                ✕
              </button>
            </div>
            {t(`param.${paramId}.info`)}
          </div>
        </>
      )}
    </span>
  );
}

export function GuidedSlider({
  def,
  value,
  onChange,
  disabled = false,
}: {
  def: ParamDef;
  value: number;
  onChange: (v: number) => void;
  /** True when a PID loop is driving this param (Auto) — slider becomes read-only. */
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const { severity } = paramSeverity(def, value);
  const sev = SEV[severity];
  const pct = (x: number) => ((x - def.min) / (def.max - def.min)) * 100;
  const fmt = (x: number) => x.toFixed(def.decimals ?? 0);
  const optLeft = pct(def.optimalMin);
  const optWidth = pct(def.optimalMax) - optLeft;

  return (
    <div className="px-1 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-ink">{t(`param.${def.id}.label`)}</span>
          <InfoButton paramId={def.id} />
          <FormulaHint formula={def.formula} />
        </div>
        <div className="flex items-center gap-1">
          {disabled && <span className="rounded bg-ok/20 px-1 py-0.5 text-[9px] font-semibold uppercase text-ok">{t("common.auto")}</span>}
          <span className={`rounded-md border px-1.5 py-0.5 font-mono text-xs tabular-nums ${sev.badge}`}>
            {fmt(value)}
            {def.unit && <span className="ml-0.5 opacity-70">{def.unit}</span>}
          </span>
        </div>
      </div>
      <div className="relative flex h-5 items-center">
        <div className="absolute inset-x-0 h-2 overflow-hidden rounded-full bg-panel-3">
          {/* recommended (green) zone */}
          <div
            className="absolute h-full border-x border-ok/50 bg-ok/25"
            style={{ left: `${optLeft}%`, width: `${optWidth}%` }}
          />
        </div>
        <input
          type="range"
          className={`guided-slider absolute inset-x-0 ${disabled ? "pointer-events-none opacity-60" : ""}`}
          style={{ "--thumb": sev.thumb } as React.CSSProperties}
          min={def.min}
          max={def.max}
          step={def.step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={t(`param.${def.id}.label`)}
          disabled={disabled}
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted/70">
        <span>{fmt(def.min)}</span>
        <span className="text-ok/80">
          {t("common.optimalRange")} {fmt(def.optimalMin)}–{fmt(def.optimalMax)}
        </span>
        <span>{fmt(def.max)}</span>
      </div>
    </div>
  );
}
