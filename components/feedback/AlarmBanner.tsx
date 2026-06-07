"use client";
import { useTranslation } from "react-i18next";
import { useSimStore } from "@/store/simStore";

/** Flashing red SCADA banner shown whenever any CRITICAL alarm is active. */
export function AlarmBanner() {
  const { t } = useTranslation();
  const alarms = useSimStore((s) => s.alarms);
  const critical = alarms.filter((a) => a.severity === "critical");
  if (critical.length === 0) return null;

  return (
    <div className="flex animate-pulse items-center gap-3 border-b-2 border-crit bg-crit/15 px-4 py-2">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-crit text-sm text-white">⚠</span>
      <span className="shrink-0 text-sm font-bold tracking-wide text-crit">{t("common.alarmCritical")}</span>
      <span className="truncate text-xs text-ink/90">
        {critical
          .map((a) => {
            const label = t(`${a.kind}.${a.id}.label`);
            return `${label} ${a.direction === "high" ? "▲" : "▼"} ${a.value.toFixed(1)} (≥ ${a.limit})`;
          })
          .join("   ·   ")}
      </span>
    </div>
  );
}
