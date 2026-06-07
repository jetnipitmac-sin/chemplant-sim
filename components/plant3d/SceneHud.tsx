"use client";
/** DOM overlays drawn on top of the 3D canvas: status legend, the click-to-inspect
 *  equipment card, and the WebXR (AR/VR) entry controls. */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSimulationStore } from "@/store/simulationStore";
import { useSimStore } from "@/store/simStore";
import { statusColor } from "./parts";
import type { EquipmentId } from "@/lib/simulation/types";

function XrayToggle() {
  const { t } = useTranslation();
  const xray = useSimStore((s) => s.xray);
  const toggle = useSimStore((s) => s.toggleXray);
  return (
    <button
      onClick={toggle}
      className={`btn pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2 ${xray ? "btn-primary" : ""}`}
      title="Reveal the reactor fluid"
    >
      ☢ {t("common.xray")}
    </button>
  );
}

const fmt = (n: number | undefined, d = 1) => (n ?? 0).toFixed(d);

function InspectorCard() {
  const id = useSimulationStore((s) => s.selectedEquipment) as EquipmentId | null;
  const eq = useSimulationStore((s) => (id ? s.snapshot?.equipment[id] : null));
  const select = useSimulationStore((s) => s.selectEquipment);
  const setTab = useSimulationStore((s) => s.setActiveTab);
  if (!id || !eq) return null;
  const color = statusColor(eq.status);
  return (
    <div className="panel pointer-events-auto absolute bottom-4 left-4 w-64 animate-fade-in p-0">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="led" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
          <span className="font-mono text-sm text-ink">{id}</span>
          <span className="text-xs text-muted">{eq.name}</span>
        </div>
        <button className="text-muted hover:text-ink" onClick={() => select(null)} aria-label="close">
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-px bg-edge">
        <Metric label="Temperature" value={`${fmt(eq.temperature)} K`} />
        <Metric label="Pressure" value={`${fmt(eq.pressure, 2)} bar`} />
        {eq.kind === "reactor" ? (
          <>
            <Metric label="Conversion" value={`${fmt((eq.conversion ?? 0) * 100, 0)} %`} />
            <Metric label="Duty" value={`${fmt(eq.duty, 0)} kW`} />
          </>
        ) : eq.kind === "column" ? (
          <>
            <Metric label="Purity (B)" value={`${fmt((eq.purity ?? 0) * 100, 0)} %`} />
            <Metric label="Reboiler" value={`${fmt(eq.duty, 0)} kW`} />
          </>
        ) : (
          <>
            <Metric label="Level" value={`${fmt(eq.level, 0)} %`} />
            <Metric label="Flow out" value={`${fmt(eq.flowOut, 0)} L/min`} />
          </>
        )}
      </div>
      <div className="p-2">
        <button
          className="btn btn-primary w-full"
          onClick={() => {
            setTab("unitops");
          }}
        >
          Open in Unit Operations →
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-panel px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="stat-value text-sm text-ink">{value}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="panel pointer-events-none absolute left-4 top-4 px-3 py-2 text-xs">
      <div className="mb-1.5 font-medium text-muted">Plant status</div>
      <div className="flex flex-col gap-1">
        {([["normal", "Normal"], ["warning", "Warning"], ["critical", "Critical"]] as const).map(([s, label]) => (
          <div key={s} className="flex items-center gap-2">
            <span className="led" style={{ background: statusColor(s) }} />
            <span className="text-ink/80">{label}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-edge pt-1.5 text-[10px] text-muted">Drag to orbit · scroll to zoom · click a unit</div>
    </div>
  );
}

interface XrLike {
  enterAR: () => Promise<unknown>;
  enterVR: () => Promise<unknown>;
}

export function XRControls({ store }: { store: XrLike }) {
  const [support, setSupport] = useState({ ar: false, vr: false });
  useEffect(() => {
    const xr = (navigator as unknown as { xr?: { isSessionSupported?: (m: string) => Promise<boolean> } }).xr;
    if (!xr?.isSessionSupported) return;
    let alive = true;
    Promise.all([
      xr.isSessionSupported("immersive-ar").catch(() => false),
      xr.isSessionSupported("immersive-vr").catch(() => false),
    ]).then(([ar, vr]) => alive && setSupport({ ar: !!ar, vr: !!vr }));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="pointer-events-auto absolute right-4 top-4 flex items-center gap-2">
      <span className="chip">XR</span>
      <button
        className="btn btn-primary"
        onClick={() => store.enterAR().catch(() => {})}
        disabled={!support.ar}
        title={support.ar ? "Enter immersive AR" : "WebXR AR unavailable on this device/browser"}
      >
        ◈ AR
      </button>
      <button
        className="btn"
        onClick={() => store.enterVR().catch(() => {})}
        disabled={!support.vr}
        title={support.vr ? "Enter immersive VR" : "WebXR VR unavailable on this device/browser"}
      >
        ▣ VR
      </button>
    </div>
  );
}

export function SceneOverlay() {
  return (
    <>
      <Legend />
      <InspectorCard />
      <XrayToggle />
    </>
  );
}
