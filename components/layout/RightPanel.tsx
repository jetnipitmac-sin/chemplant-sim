"use client";
import { useTranslation } from "react-i18next";
import { useSimStore, useUnackedCount } from "@/store/simStore";
import { OutputPanel } from "@/components/feedback/OutputPanel";
import { EconomicsPanel } from "@/components/economics/Economics";
import { TrendPanel } from "@/components/feedback/TrendGraph";
import { ParameterPanel } from "@/components/controls/ParameterPanel";
import { ControllerPanel } from "@/components/controls/ControllerPanel";
import { ConsequencePanel } from "@/components/feedback/ConsequencePanel";
import { AlarmLogPanel } from "@/components/feedback/AlarmLogPanel";
import { FormulaPanel } from "@/components/theory/FormulaPanel";

const TABS = ["simulate", "alarms", "learn"] as const;

export function RightPanel({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const tab = useSimStore((s) => s.rightTab);
  const setTab = useSimStore((s) => s.setRightTab);
  const unacked = useUnackedCount();

  return (
    <aside
      className={`fixed inset-y-0 right-0 z-40 flex h-full w-[380px] max-w-[85vw] shrink-0 flex-col border-l border-edge bg-base/95 backdrop-blur transition-transform duration-300 ${
        open ? "translate-x-0" : "translate-x-full"
      } lg:static lg:z-auto lg:max-w-none lg:translate-x-0 lg:bg-base/40 lg:backdrop-blur-none`}
    >
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-edge px-3">
        {TABS.map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`relative flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
              tab === k ? "bg-brand/15 text-brand" : "text-muted hover:bg-panel-2 hover:text-ink"
            }`}
          >
            {t(`common.${k}`)}
            {k === "alarms" && unacked > 0 && (
              <span className="ml-1 animate-blink rounded-full bg-crit px-1.5 text-[10px] font-bold text-white">{unacked}</span>
            )}
          </button>
        ))}
        <button onClick={onClose} className="ml-1 shrink-0 px-1.5 text-muted hover:text-ink lg:hidden" aria-label="Close panel">✕</button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {tab === "simulate" && (
          <>
            <OutputPanel />
            <TrendPanel />
            <EconomicsPanel />
            <ParameterPanel />
            <ControllerPanel />
            <ConsequencePanel />
          </>
        )}
        {tab === "alarms" && <AlarmLogPanel />}
        {tab === "learn" && <FormulaPanel />}
      </div>
    </aside>
  );
}
