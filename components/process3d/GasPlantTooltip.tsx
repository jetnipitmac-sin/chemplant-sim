"use client";
/**
 * Hover tooltip for the Gas Separation Plant scene. Reads the LIVE simulator
 * state (params + model outputs + active alarms) for the hovered equipment and
 * follows the cursor. Dark `#0f151e` card with teal accents; values turn
 * yellow/red when their output/param is in warning/danger.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { GspEquipId, useGspHover } from "@/store/gspStore";
import { useSimStore } from "@/store/simStore";

const META: Record<GspEquipId, { name: string; tag: string }> = {
  slugCatcher: { name: "Slug Catcher", tag: "SC-101" },
  amineTower: { name: "Amine Tower · AGRU", tag: "T-201" },
  dehydration: { name: "Dehydration Beds", tag: "V-301 A/B" },
  coldBox: { name: "Cold Box & Expander", tag: "E-401 · KT-401" },
  demethanizer: { name: "Demethanizer", tag: "C-501" },
  deethanizer: { name: "Deethanizer", tag: "C-502" },
  depropanizer: { name: "Depropanizer", tag: "C-503" },
  debutanizer: { name: "Debutanizer", tag: "C-504" },
};

interface Row {
  label: string;
  value: number;
  unit: string;
  dec?: number;
  sevId?: string;
}

export function GasPlantTooltip() {
  const id = useGspHover((s) => s.hoveredId);
  const p = useSimStore((s) => s.params.gsp);
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
    slugCatcher: [
      { label: "Raw Gas Feed", value: p.rawGasFeed ?? 0, unit: "MMSCFD", sevId: "rawGasFeed" },
      { label: "Sales Gas", value: o.gspSalesGas ?? 0, unit: "%", dec: 1 },
      { label: "Compression", value: o.gspCompPower ?? 0, unit: "MW", dec: 1 },
    ],
    amineTower: [
      { label: "Amine Circulation", value: p.amineCirculation ?? 0, unit: "m³/h", sevId: "amineCirculation" },
      { label: "CO₂ Slip", value: o.gspCO2Slip ?? 0, unit: "ppm", sevId: "gspCO2Slip" },
      { label: "Raw Gas Feed", value: p.rawGasFeed ?? 0, unit: "MMSCFD", sevId: "rawGasFeed" },
    ],
    dehydration: [
      { label: "Hydrate Risk", value: o.gspHydrate ?? 0, unit: "%", sevId: "gspHydrate" },
      { label: "Raw Gas Feed", value: p.rawGasFeed ?? 0, unit: "MMSCFD", sevId: "rawGasFeed" },
      { label: "Demeth. Temp", value: p.demethanizerTemp ?? 0, unit: "°C", sevId: "demethanizerTemp" },
    ],
    coldBox: [
      { label: "Expander ΔP", value: p.expanderPressureDrop ?? 0, unit: "bar", dec: 1, sevId: "expanderPressureDrop" },
      { label: "Compression", value: o.gspCompPower ?? 0, unit: "MW", dec: 1 },
      { label: "C₂ Recovery", value: o.gspC2Recovery ?? 0, unit: "%", dec: 1, sevId: "gspC2Recovery" },
      { label: "Hydrate Risk", value: o.gspHydrate ?? 0, unit: "%", sevId: "gspHydrate" },
    ],
    demethanizer: [
      { label: "Top Temp", value: p.demethanizerTemp ?? 0, unit: "°C", sevId: "demethanizerTemp" },
      { label: "C₂ Recovery", value: o.gspC2Recovery ?? 0, unit: "%", dec: 1, sevId: "gspC2Recovery" },
      { label: "Sales Gas (C₁)", value: o.gspSalesGas ?? 0, unit: "%", dec: 1 },
    ],
    deethanizer: [
      { label: "Ethane (C₂)", value: o.gspEthane ?? 0, unit: "%", dec: 1 },
      { label: "C₂ Recovery", value: o.gspC2Recovery ?? 0, unit: "%", dec: 1, sevId: "gspC2Recovery" },
      { label: "Top Temp", value: p.demethanizerTemp ?? 0, unit: "°C", sevId: "demethanizerTemp" },
    ],
    depropanizer: [
      { label: "Propane (C₃)", value: o.gspPropane ?? 0, unit: "%", dec: 1 },
      { label: "Butane (C₄)", value: o.gspButane ?? 0, unit: "%", dec: 1 },
    ],
    debutanizer: [
      { label: "Butane (C₄)", value: o.gspButane ?? 0, unit: "%", dec: 1 },
      { label: "Condensate (C₅₊)", value: o.gspCondensate ?? 0, unit: "%", dec: 1 },
    ],
  }[id];

  return (
    <div
      ref={boxRef}
      className="pointer-events-none fixed z-50 w-[238px] rounded-lg border border-teal-400/30 px-3.5 py-3 text-[12px] text-slate-300 backdrop-blur-sm"
      style={{ left: pos.current.x, top: pos.current.y, background: "#0f151e", boxShadow: "0 10px 40px -10px rgba(45,212,191,0.4)" }}
    >
      <div className="mb-2 flex items-start justify-between gap-3 border-b border-teal-400/15 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-teal-400 shadow-[0_0_8px] shadow-teal-400" />
          <span className="font-medium leading-tight text-teal-100">{meta.name}</span>
        </div>
        <span className="shrink-0 rounded bg-teal-400/10 px-1.5 py-0.5 font-mono text-[10px] text-teal-300/90">{meta.tag}</span>
      </div>
      <div className="space-y-1">
        {rows.map((r) => {
          const s = r.sevId ? sev(r.sevId) : undefined;
          const color = s === "critical" ? "#ef4444" : s === "warning" ? "#f59e0b" : "#5eead4";
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
      <div className="mt-2 border-t border-teal-400/10 pt-1.5 text-[9px] text-slate-600">Live process data</div>
    </div>
  );
}
