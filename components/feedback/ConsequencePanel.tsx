"use client";
/** The Consequence Engine UI: turns out-of-range parameters into plain-language
 *  physical/economic warnings, escalating warning → danger. */
import { useTranslation } from "react-i18next";
import { evaluateConsequences } from "@/lib/processes";
import { useActiveConfig, useSimStore } from "@/store/simStore";

export function ConsequencePanel() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const params = useSimStore((s) => s.params[config.id]);
  const issues = evaluateConsequences(config, params);
  const hasDanger = issues.some((i) => i.severity === "danger");

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            {t("common.consequences")}
            {issues.length > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10px] font-bold ${
                  hasDanger ? "animate-blink bg-crit text-white" : "bg-warn text-black"
                }`}
              >
                {issues.length}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-muted">{t("common.consequencesSub")}</p>
        </div>
      </div>
      <div className="space-y-2 p-3">
        {issues.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-ok/30 bg-ok/5 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ok/15 text-ok">✓</span>
            <div>
              <div className="text-sm font-medium text-ok">{t("common.allOptimal")}</div>
              <div className="text-xs leading-relaxed text-muted">{t("common.allOptimalDesc")}</div>
            </div>
          </div>
        ) : (
          issues.map((issue) => {
            const danger = issue.severity === "danger";
            return (
              <div
                key={issue.paramId}
                className={`flex items-start gap-3 rounded-lg border p-3 animate-fade-in ${
                  danger ? "border-crit/40 bg-crit/5" : "border-warn/40 bg-warn/5"
                }`}
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm ${
                    danger ? "bg-crit/15 text-crit" : "bg-warn/15 text-warn"
                  }`}
                >
                  {danger ? "⚠" : "!"}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-ink">{t(`param.${issue.paramId}.label`)}</span>
                    <span className={`rounded px-1 text-[10px] ${danger ? "bg-crit/20 text-crit" : "bg-warn/20 text-warn"}`}>
                      {issue.direction === "high" ? t("common.tooHigh") : t("common.tooLow")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ink/80">{t(`param.${issue.paramId}.${issue.direction}`)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
