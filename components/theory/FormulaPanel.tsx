"use client";
import { useTranslation } from "react-i18next";
import { useActiveConfig } from "@/store/simStore";
import { Katex } from "@/components/ui/Katex";

export function FormulaPanel() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("common.formulasTitle")}</h3>
          <p className="text-[11px] text-muted">{t("common.formulasSub")}</p>
        </div>
      </div>
      <div className="space-y-3 p-3">
        {config.formulas.map((f) => (
          <div key={f.id} className="rounded-lg border border-edge bg-panel-2/50 p-3">
            <div className="mb-2 text-sm font-medium text-ink">{t(`formula.${f.id}.title`)}</div>
            <div className="overflow-x-auto rounded-md border border-edge bg-base/60 px-3 py-3 text-ink">
              <Katex math={f.tex} display />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted">{t(`formula.${f.id}.desc`)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
