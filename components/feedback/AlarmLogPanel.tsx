"use client";
/** DCS alarm journal: chronological raise/clear log with per-alarm + bulk acknowledge. */
import { useTranslation } from "react-i18next";
import { useSimStore } from "@/store/simStore";

const since = (ms: number) => {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

export function AlarmLogPanel() {
  const { t } = useTranslation();
  const log = useSimStore((s) => s.alarmLog);
  const ackAll = useSimStore((s) => s.acknowledgeAll);
  const ackOne = useSimStore((s) => s.acknowledgeAlarm);

  const sorted = [...log].sort(
    (a, b) => (a.clearedAt == null ? 0 : 1) - (b.clearedAt == null ? 0 : 1) || b.raisedAt - a.raisedAt,
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("common.alarmLog")}</h3>
          <p className="text-[11px] text-muted">{t("common.alarmLogSub")}</p>
        </div>
        <button className="btn px-2 py-1 text-xs" onClick={ackAll}>
          ✓ {t("common.ackAll")}
        </button>
      </div>
      <div className="max-h-[calc(100vh-140px)] divide-y divide-edge/60 overflow-auto">
        {sorted.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">{t("common.noAlarmsLogged")}</div>
        ) : (
          sorted.map((e) => {
            const active = e.clearedAt == null;
            const crit = e.severity === "critical";
            const dur = active ? since(e.raisedAt) : `${Math.max(1, Math.round((e.clearedAt! - e.raisedAt) / 1000))}s`;
            return (
              <div key={e.uid} className={`flex items-start gap-3 px-3 py-2 ${active ? (crit ? "bg-crit/5" : "bg-warn/5") : "opacity-60"}`}>
                <span className={`led mt-1 ${active ? (crit ? "animate-blink bg-crit" : "bg-warn") : "bg-muted"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-ink">{t(`${e.kind}.${e.id}.label`)}</span>
                    <span className={`rounded px-1 text-[9px] font-bold ${active ? (crit ? "bg-crit/20 text-crit" : "bg-warn/20 text-warn") : "bg-panel-3 text-muted"}`}>
                      {active ? t("common.activeState") : t("common.clearedState")}
                    </span>
                    {e.acked && active && <span className="rounded bg-panel-3 px-1 text-[9px] text-muted">{t("common.ackedState")}</span>}
                  </div>
                  <div className="text-[10px] text-muted">{active ? dur : `${t("common.lasted")} ${dur}`}</div>
                </div>
                {active && !e.acked && (
                  <button onClick={() => ackOne(e.id)} className="btn px-1.5 py-0.5 text-[10px]">
                    {t("common.acknowledge")}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
