"use client";
import { useTranslation } from "react-i18next";
import { useSimStore } from "@/store/simStore";

export function LeaderboardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const leaderboard = useSimStore((s) => s.leaderboard);
  if (!open) return null;
  const sorted = [...leaderboard].sort((a, b) => b.score - a.score || b.at - a.at).slice(0, 15);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="panel w-full max-w-md animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h3 className="text-sm font-semibold text-ink">🏆 {t("common.leaderboard")}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink" aria-label={t("common.close")}>
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {sorted.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted">{t("common.noScores")}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left text-[10px] uppercase tracking-wider text-muted">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">{t("common.missions")}</th>
                  <th className="px-3 py-2 text-right">{t("common.score")}</th>
                  <th className="px-3 py-2 text-right">{t("common.time")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge/60">
                {sorted.map((e, i) => (
                  <tr key={e.id} className={i === 0 ? "bg-brand/5" : ""}>
                    <td className="stat-value px-3 py-2 text-muted">{i === 0 ? "🥇" : i + 1}</td>
                    <td className="px-3 py-2">
                      <div className="text-xs text-ink">{t(`scenario.${e.scenarioId}.title`)}</div>
                      <div className="text-[10px] text-muted">{new Date(e.at).toLocaleString()}</div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className={`stat-value ${e.status === "success" ? "text-ok" : "text-crit"}`}>
                        {e.status === "success" ? e.score : "✕"}
                      </span>
                    </td>
                    <td className="stat-value px-3 py-2 text-right text-muted">{e.timeSec}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
