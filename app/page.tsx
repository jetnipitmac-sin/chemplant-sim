"use client";
import { useEffect } from "react";
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

  return (
    <>
      <div className="flex h-screen overflow-hidden print:hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ProcessHeader />
        <ScenarioBar />
        <AlarmBanner />
        <div className={`relative min-h-0 flex-1 ${critical ? "animate-pulse ring-2 ring-inset ring-crit/70" : ""}`}>
          {viewMode === "3d" ? <ProcessScene /> : <PidView />}
        </div>
      </div>
      <RightPanel />
      <CopilotPanel />
      </div>
      <PrintReport />
    </>
  );
}
