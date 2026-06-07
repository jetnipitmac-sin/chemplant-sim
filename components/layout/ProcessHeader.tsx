"use client";
import { useTranslation } from "react-i18next";
import { useActiveConfig } from "@/store/simStore";
import { useSimulationStore } from "@/store/simulationStore";
import { ViewToggle } from "./ViewToggle";
import { DvrControls } from "./DvrControls";
import { EconomicsTicker, EcoBadge } from "@/components/economics/Economics";

function SafetyBadge() {
  const safety = useSimulationStore((s) => s.snapshot?.kpis.safetyScore ?? 100);
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${
        safety >= 80 ? "border-ok/40 text-ok" : safety >= 50 ? "border-warn/40 text-warn" : "border-crit/40 text-crit"
      }`}
    >
      <span className={`led ${safety >= 80 ? "bg-ok" : safety >= 50 ? "bg-warn" : "animate-blink bg-crit"}`} />
      <span className="stat-value text-xs">{safety.toFixed(0)}</span>
    </div>
  );
}

export function ProcessHeader() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  return (
    <div className="flex items-center justify-between gap-4 border-b border-edge bg-panel/40 px-5 py-2.5 backdrop-blur">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <h2 className="truncate text-base font-semibold" style={{ color: config.accent }}>
            {t(`process.${config.id}.name`)}
          </h2>
          <span className="rounded-md border border-edge px-1.5 py-0.5 text-[10px] text-muted">{t(`process.${config.id}.tagline`)}</span>
        </div>
        <p className="mt-0.5 line-clamp-1 max-w-xl text-xs leading-relaxed text-muted">{t(`process.${config.id}.desc`)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <EconomicsTicker />
        <EcoBadge />
        <ViewToggle />
        <DvrControls />
        <button onClick={() => window.print()} className="btn px-2 py-1.5 text-xs" title={t("common.report")} aria-label={t("common.report")}>
          ⎙
        </button>
        {config.live && <SafetyBadge />}
      </div>
    </div>
  );
}
