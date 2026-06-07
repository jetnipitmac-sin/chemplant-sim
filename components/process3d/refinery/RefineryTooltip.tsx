"use client";
/**
 * Single HTML overlay tooltip for the refinery scene. It reads the hovered
 * equipment id + live (mocked) telemetry from `useRefineryStore` and follows
 * the cursor. Rendered OUTSIDE the <Canvas> (a sibling in RefineryScene) so it
 * is plain DOM, styled with Tailwind on a dark `#0f151e` card with cyan accents.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { EquipmentId, ProductCut, useRefineryStore } from "@/store/refineryStore";

const META: Record<EquipmentId, { name: string; tag: string }> = {
  tankFarm: { name: "Crude Tank Farm", tag: "TK-101 / 108" },
  crudePumps: { name: "Crude Charge Pumps", tag: "P-101 A/B" },
  desalter: { name: "Two-Stage Desalter", tag: "V-102" },
  heatExchangers: { name: "Crude Preheat Train", tag: "E-101 / 106" },
  firedHeater: { name: "Crude Fired Heater", tag: "H-101" },
  airCoolers: { name: "Overhead Air Coolers", tag: "EA-101" },
  flareStack: { name: "Flare Stack", tag: "FL-101" },
  column: { name: "Atmospheric Distillation Column", tag: "T-101" },
};

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono tabular-nums text-cyan-300">
        {value}
        {unit && <span className="ml-1 text-[10px] font-normal text-slate-500">{unit}</span>}
      </span>
    </div>
  );
}

function CutRow({ c }: { c: ProductCut }) {
  return (
    <div className="grid grid-cols-[10px_1fr_auto] items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
      <div className="min-w-0">
        <div className="truncate text-[11px] leading-tight text-slate-200">{c.name}</div>
        <div className="font-mono text-[9px] leading-tight text-slate-500">
          {c.carbon} · {c.bp}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1 w-12 overflow-hidden rounded bg-slate-700/50">
          <div className="h-full rounded" style={{ width: `${Math.min(100, c.pct * 3.5)}%`, background: c.color }} />
        </div>
        <span className="w-9 text-right font-mono text-[11px] tabular-nums text-cyan-200">{c.pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export function RefineryTooltip() {
  const s = useRefineryStore();
  const id = s.hoveredId;
  const boxRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -1000, y: -1000 });

  // Position the card relative to the cursor, clamped to the viewport.
  const place = () => {
    const el = boxRef.current;
    if (!el) return;
    const pad = 16;
    const { x, y } = pos.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = x + pad;
    let top = y + pad;
    if (left + w > window.innerWidth - 8) left = x - w - pad;
    if (top + h > window.innerHeight - 8) top = window.innerHeight - h - 8;
    el.style.left = `${Math.max(8, left)}px`;
    el.style.top = `${Math.max(8, top)}px`;
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
      place();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Reposition when the card appears / its size changes.
  useLayoutEffect(place, [id, s.cuts]);

  if (!id) return null;
  const meta = META[id];

  return (
    <div
      ref={boxRef}
      className="pointer-events-none fixed z-50 w-[268px] rounded-lg border border-cyan-400/30 px-3.5 py-3 text-[12px] text-slate-300 shadow-2xl shadow-cyan-950/40 backdrop-blur-sm"
      style={{ left: pos.current.x, top: pos.current.y, background: "#0f151e", boxShadow: "0 10px 40px -10px rgba(8,145,178,0.35)" }}
    >
      {/* header */}
      <div className="mb-2 flex items-start justify-between gap-3 border-b border-cyan-400/15 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px] shadow-cyan-400" />
          <span className="font-medium leading-tight text-cyan-100">{meta.name}</span>
        </div>
        <span className="shrink-0 rounded bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300/90">{meta.tag}</span>
      </div>

      {/* body */}
      <div className="space-y-1">
        {id === "tankFarm" && (
          <>
            <Stat label="Crude Inventory" value={s.tankFarm.inventory.toLocaleString(undefined, { maximumFractionDigits: 0 })} unit="bbl" />
            <Stat label="API Gravity" value={s.tankFarm.api.toFixed(1)} unit="°API" />
          </>
        )}
        {id === "crudePumps" && (
          <>
            <Stat label="Flow Rate" value={s.crudePumps.flow.toFixed(0)} unit="m³/hr" />
            <Stat label="Discharge Pressure" value={s.crudePumps.discharge.toFixed(1)} unit="barg" />
          </>
        )}
        {id === "desalter" && (
          <>
            <Stat label="Water Injection" value={s.desalter.waterInjection.toFixed(1)} unit="%" />
            <Stat label="Salt Content" value={s.desalter.salt.toFixed(2)} unit="ptb" />
          </>
        )}
        {id === "heatExchangers" && (
          <>
            <Stat label="Heat Duty" value={s.heatExchangers.duty.toFixed(1)} unit="MW" />
            <Stat label="Inlet Temp" value={s.heatExchangers.inletT.toFixed(0)} unit="°C" />
            <Stat label="Outlet Temp" value={s.heatExchangers.outletT.toFixed(0)} unit="°C" />
          </>
        )}
        {id === "firedHeater" && (
          <>
            <Stat label="Fuel Gas" value={s.firedHeater.fuelGas.toFixed(0)} unit="kg/h" />
            <Stat label="Coil Outlet Temp" value={s.firedHeater.coilOutletT.toFixed(0)} unit="°C" />
          </>
        )}
        {id === "airCoolers" && (
          <>
            <Stat label="Fan Speed" value={s.airCoolers.fanRpm.toFixed(0)} unit="RPM" />
            <Stat label="Air ΔT" value={s.airCoolers.airDeltaT.toFixed(1)} unit="°C" />
          </>
        )}
        {id === "flareStack" && (
          <>
            <Stat label="Header Pressure" value={s.flareStack.headerP.toFixed(2)} unit="barg" />
            <Stat label="Purge Flow" value={s.flareStack.purge.toFixed(0)} unit="Nm³/h" />
          </>
        )}
        {id === "column" && (
          <>
            <Stat label="Top Pressure" value={s.column.topPressure.toFixed(2)} unit="barg" />
            <Stat label="Reflux Ratio" value={s.column.refluxRatio.toFixed(2)} unit="L/D" />
            <div className="mt-2 border-t border-cyan-400/15 pt-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400/80">Fractional Yields</span>
                <span className="text-[9px] text-slate-500">8 cuts · light → heavy</span>
              </div>
              <div className="space-y-1.5">
                {s.cuts.map((c) => (
                  <CutRow key={c.key} c={c} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mt-2 border-t border-cyan-400/10 pt-1.5 text-[9px] text-slate-600">
        {id === "column" ? "Click the column to adjust setpoints · live mock telemetry" : "Live mock telemetry"}
      </div>
    </div>
  );
}
