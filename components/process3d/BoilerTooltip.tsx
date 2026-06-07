"use client";
/**
 * Hover tooltip for the Power Boiler scene. Reads the LIVE simulator state
 * (params + model outputs + active alarms) for the hovered equipment and
 * follows the cursor. Dark `#0f151e` card with amber accents; values turn
 * yellow/red when their output is in warning/danger.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { BoilerEquipId, useBoilerHover } from "@/store/boilerStore";
import { useSimStore } from "@/store/simStore";

const META: Record<BoilerEquipId, { name: string; tag: string }> = {
  furnace: { name: "Furnace & Burners", tag: "F-301" },
  steamDrum: { name: "Steam Drum", tag: "D-301" },
  superheater: { name: "Superheater", tag: "SH-301" },
  turbine: { name: "Steam Turbine", tag: "T-301 · G" },
  feedwater: { name: "Feedwater System", tag: "P-301" },
  stack: { name: "Stack & Economizer", tag: "ST-301" },
};

interface Row {
  label: string;
  value: number;
  unit: string;
  dec?: number;
  sevId?: string;
}

export function BoilerTooltip() {
  const id = useBoilerHover((s) => s.hoveredId);
  const p = useSimStore((s) => s.params.boiler);
  const o = useSimStore((s) => s.outputs);
  const alarms = useSimStore((s) => s.alarms);
  const boxRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -1000, y: -1000 });

  const place = () => {
    const el = boxRef.current;
    if (!el) return;
    const pad = 16;
    const { x, y } = pos.current;
    let left = x + pad;
    let top = y + pad;
    if (left + el.offsetWidth > window.innerWidth - 8) left = x - el.offsetWidth - pad;
    if (top + el.offsetHeight > window.innerHeight - 8) top = window.innerHeight - el.offsetHeight - 8;
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
  useLayoutEffect(place, [id, o]);

  if (!id) return null;
  const meta = META[id];
  const sev = (outId: string) => alarms.find((a) => a.id === outId)?.severity;

  const rows: Row[] = {
    furnace: [
      { label: "Fuel Firing", value: p.boilerFuelRate ?? 0, unit: "t/h", dec: 1, sevId: "boilerFuelRate" },
      { label: "Excess Air", value: p.boilerAirFlow ?? 0, unit: "%", sevId: "boilerAirFlow" },
      { label: "Flue-Gas O₂", value: o.boilerO2 ?? 0, unit: "%", dec: 1, sevId: "boilerO2" },
      { label: "NOₓ", value: o.boilerNOx ?? 0, unit: "mg/Nm³", sevId: "boilerNOx" },
    ],
    steamDrum: [
      { label: "Steam Pressure", value: o.boilerSteamP ?? 0, unit: "bar", sevId: "boilerSteamP" },
      { label: "Drum Level", value: o.boilerDrumLevel ?? 0, unit: "%", sevId: "boilerDrumLevel" },
      { label: "Steam Flow", value: o.boilerSteamFlow ?? 0, unit: "t/h" },
    ],
    superheater: [
      { label: "Steam Flow", value: o.boilerSteamFlow ?? 0, unit: "t/h" },
      { label: "Stack Temp", value: o.boilerStackTemp ?? 0, unit: "°C", sevId: "boilerStackTemp" },
      { label: "Steam Pressure", value: o.boilerSteamP ?? 0, unit: "bar", sevId: "boilerSteamP" },
    ],
    turbine: [
      { label: "Steam Demand", value: p.steamDemand ?? 0, unit: "t/h" },
      { label: "Steam Flow", value: o.boilerSteamFlow ?? 0, unit: "t/h" },
      { label: "Boiler Efficiency", value: o.boilerEfficiency ?? 0, unit: "%", dec: 1 },
    ],
    feedwater: [
      { label: "Feedwater Flow", value: p.feedwaterFlow ?? 0, unit: "t/h", sevId: "feedwaterFlow" },
      { label: "Drum Level", value: o.boilerDrumLevel ?? 0, unit: "%", sevId: "boilerDrumLevel" },
    ],
    stack: [
      { label: "Stack Temp", value: o.boilerStackTemp ?? 0, unit: "°C", sevId: "boilerStackTemp" },
      { label: "Flue-Gas O₂", value: o.boilerO2 ?? 0, unit: "%", dec: 1, sevId: "boilerO2" },
      { label: "NOₓ", value: o.boilerNOx ?? 0, unit: "mg/Nm³", sevId: "boilerNOx" },
    ],
  }[id];

  return (
    <div
      ref={boxRef}
      className="pointer-events-none fixed z-50 w-[230px] rounded-lg border border-amber-400/30 px-3.5 py-3 text-[12px] text-slate-300 backdrop-blur-sm"
      style={{ left: pos.current.x, top: pos.current.y, background: "#0f151e", boxShadow: "0 10px 40px -10px rgba(251,146,60,0.35)" }}
    >
      <div className="mb-2 flex items-start justify-between gap-3 border-b border-amber-400/15 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400 shadow-[0_0_8px] shadow-amber-400" />
          <span className="font-medium leading-tight text-amber-100">{meta.name}</span>
        </div>
        <span className="shrink-0 rounded bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300/90">{meta.tag}</span>
      </div>
      <div className="space-y-1">
        {rows.map((r) => {
          const s = r.sevId ? sev(r.sevId) : undefined;
          const color = s === "critical" ? "#ef4444" : s === "warning" ? "#f59e0b" : "#fcd34d";
          return (
            <div key={r.label} className="flex items-baseline justify-between gap-6">
              <span className="text-slate-400">{r.label}</span>
              <span className="font-mono tabular-nums" style={{ color }}>
                {r.value.toFixed(r.dec ?? 0)}
                <span className="ml-1 text-[10px] font-normal text-slate-500">{r.unit}</span>
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 border-t border-amber-400/10 pt-1.5 text-[9px] text-slate-600">Live process data</div>
    </div>
  );
}
