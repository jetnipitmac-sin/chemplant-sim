"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveConfig, useSimStore } from "@/store/simStore";
import { LeaderboardModal } from "./Leaderboard";

/** Mission control: launch a guided scenario, then a live objective + countdown + score. */
export function ScenarioBar() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const scenario = useSimStore((s) => s.scenario);
  const start = useSimStore((s) => s.startScenario);
  const abort = useSimStore((s) => s.abortScenario);
  const [showLb, setShowLb] = useState(false);

  const TrophyBtn = (
    <button onClick={() => setShowLb(true)} className="btn px-2 py-1 text-xs" title={t("common.leaderboard")}>
      🏆
    </button>
  );

  if (config.scenarios.length === 0) return null;

  let body;
  if (!scenario) {
    body = (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("common.missions")}</span>
        {config.scenarios.map((sc) => (
          <button key={sc.id} onClick={() => start(sc.id)} className="btn btn-primary px-2.5 py-1 text-xs">
            ▶ {t(`scenario.${sc.id}.title`)}
          </button>
        ))}
        {TrophyBtn}
      </div>
    );
  } else {
    const running = scenario.status === "running";
    const urgent = running && scenario.remainingSec <= 10;
    const tone =
      scenario.status === "success" ? "border-ok bg-ok/15" : scenario.status === "failed" ? "border-crit bg-crit/15" : "border-brand/50 bg-brand/10";
    return (
      <>
        <div className={`flex items-center justify-between gap-3 border-b-2 px-4 py-2 ${tone} ${urgent ? "animate-pulse" : ""}`}>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span>🎯 {t(`scenario.${scenario.id}.title`)}</span>
              {scenario.status === "success" && (
                <span className="text-ok">✓ {t("common.missionSuccess")} · {t("common.score")} {scenario.score}</span>
              )}
              {scenario.status === "failed" && <span className="text-crit">✕ {t("common.missionFailed")}</span>}
            </div>
            <div className="truncate text-xs text-muted">{running ? t(`scenario.${scenario.id}.brief`) : t("common.holdSafe")}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {running && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted">{t("common.timeLeft")}</div>
                <div className={`stat-value text-lg ${urgent ? "text-crit" : "text-ink"}`}>{Math.ceil(scenario.remainingSec)}s</div>
              </div>
            )}
            {TrophyBtn}
            <button onClick={abort} className="btn px-2 py-1 text-xs">
              {running ? t("common.abortMission") : t("common.close")}
            </button>
          </div>
        </div>
        <LeaderboardModal open={showLb} onClose={() => setShowLb(false)} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-edge bg-panel/30 px-4 py-2">{body}</div>
      <LeaderboardModal open={showLb} onClose={() => setShowLb(false)} />
    </>
  );
}
