"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { decodeRun } from "@/lib/share";
import { useCstrBridge } from "@/hooks/useCstrBridge";
import { useOutputSampler } from "@/hooks/useOutputSampler";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProcessHeader } from "@/components/layout/ProcessHeader";
import { RightPanel } from "@/components/layout/RightPanel";
import { ScenarioBar } from "@/components/scenario/ScenarioBar";
import { AlarmBanner } from "@/components/feedback/AlarmBanner";
import { PidView } from "@/components/pid/PidView";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { PrintReport } from "@/components/feedback/PrintReport";
import { useSimStore } from "@/store/simStore";

const ProcessScene = dynamic(() => import("@/components/process3d/ProcessScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-base">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-brand" />
    </div>
  ),
});

export default function Page() {
  // Keep the live CSTR ODE worker running + synced; run the evaluation/sampler loop.
  useCstrBridge();
  useOutputSampler();

  // Restore a shared run (?run=) + load the saved leaderboard, once on mount.
  useEffect(() => {
    const st = useSimStore.getState();
    st.hydrateLeaderboard();
    const run = new URLSearchParams(window.location.search).get("run");
    if (run) {
      const snap = decodeRun(run);
      if (snap) {
        st.setLanguage(snap.l);
        st.setActiveProcess(snap.p);
        Object.entries(snap.v).forEach(([k, v]) => st.setParam(snap.p, k, Number(v)));
      }
    }
  }, []);

  const viewMode = useSimStore((s) => s.viewMode);
  const critical = useSimStore((s) => s.alarms.some((a) => a.severity === "critical"));

  // Mobile/tablet drawer state (no effect at lg+ where the layout is the classic 3-column desktop).
  const [navOpen, setNavOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <>
      <div className="flex h-screen overflow-hidden print:hidden">
        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          {/* mobile top bar — drawer toggles (hidden at lg+, so desktop is unchanged) */}
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-edge bg-panel/60 px-3 backdrop-blur lg:hidden">
            <button onClick={() => setNavOpen(true)} className="btn px-2.5 py-2" aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" className="h-4 w-4">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="truncate text-sm font-semibold">ProSim Studio</span>
            <button onClick={() => setPanelOpen(true)} className="btn px-2.5 py-2" aria-label="Open metrics panel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M3 21h18" />
                <rect x="5" y="11" width="3.5" height="8" rx="1" />
                <rect x="10.5" y="6" width="3.5" height="13" rx="1" />
                <rect x="16" y="13" width="3.5" height="6" rx="1" />
              </svg>
            </button>
          </div>
          <ProcessHeader />
          <ScenarioBar />
          <AlarmBanner />
          <div className={`relative min-h-0 flex-1 ${critical ? "animate-pulse ring-2 ring-inset ring-crit/70" : ""}`}>
            {viewMode === "3d" ? <ProcessScene /> : <PidView />}
          </div>
        </div>
        <RightPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
        {/* dim backdrop while a drawer is open (mobile only) */}
        {(navOpen || panelOpen) && (
          <button
            aria-label="Close panels"
            onClick={() => { setNavOpen(false); setPanelOpen(false); }}
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          />
        )}
        <CopilotPanel />
      </div>
      <PrintReport />
    </>
  );
}
