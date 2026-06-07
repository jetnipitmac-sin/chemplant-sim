"use client";
/** Live process outputs (written each tick by the sampler) as KPI tiles, each with
 *  an optional Formula Inspector. */
import { useTranslation } from "react-i18next";
import { useActiveConfig, useSimStore } from "@/store/simStore";
import { FormulaHint } from "@/components/controls/FormulaHint";

export function OutputPanel() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const outputs = useSimStore((s) => s.outputs);

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("common.liveOutputs")}</h3>
          <p className="text-[11px] text-muted">{t("common.outputsSub")}</p>
        </div>
        {config.live && (
          <span className="chip">
            <span className="led animate-pulse bg-ok" /> live
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-px bg-edge">
        {config.outputs.map((o) => (
          <div key={o.id} className="bg-panel px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
              {t(`output.${o.id}.label`)}
              {o.formula && <FormulaHint formula={o.formula} />}
            </div>
            <div className="stat-value text-lg text-ink">
              {(outputs[o.id] ?? 0).toFixed(o.decimals ?? 0)}
              {o.unit && <span className="ml-1 text-xs text-muted">{o.unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
