"use client";
/**
 * Single HTML overlay tooltip for the cement scene. Reads hovered equipment +
 * live (mocked) telemetry from useCementStore and follows the cursor. Rendered
 * OUTSIDE the <Canvas> (a sibling in CementScene) — dark `#0f151e` card with
 * violet (cement) accents.
 */
import { useEffect, useLayoutEffect, useRef } from "react";
import { CementEquipmentId, useCementStore } from "@/store/cementStore";

const META: Record<CementEquipmentId, { name: string; tag: string }> = {
  crusher: { name: "Limestone Crusher", tag: "CR-101" },
  rawMill: { name: "Raw Mill & Blending Silos", tag: "RM-201" },
  preheater: { name: "Preheater Tower", tag: "PH-301" },
  kiln: { name: "Rotary Kiln", tag: "KL-401" },
  cooler: { name: "Clinker Cooler", tag: "CL-501" },
  baghouse: { name: "Baghouse & Stack", tag: "BF-601" },
  cementMill: { name: "Cement Mill & Finish Silos", tag: "CM-701" },
};

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono tabular-nums text-violet-300">
        {value}
        {unit && <span className="ml-1 text-[10px] font-normal text-slate-500">{unit}</span>}
      </span>
    </div>
  );
}

export function CementTooltip() {
  const s = useCementStore();
  const id = s.hoveredId;
  const boxRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -1000, y: -1000 });

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

  useLayoutEffect(place, [id]);

  if (!id) return null;
  const meta = META[id];

  return (
    <div
      ref={boxRef}
      className="pointer-events-none fixed z-50 w-[252px] rounded-lg border border-violet-400/30 px-3.5 py-3 text-[12px] text-slate-300 backdrop-blur-sm"
      style={{ left: pos.current.x, top: pos.current.y, background: "#0f151e", boxShadow: "0 10px 40px -10px rgba(139,92,246,0.4)" }}
    >
      <div className="mb-2 flex items-start justify-between gap-3 border-b border-violet-400/15 pb-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-violet-400 shadow-[0_0_8px] shadow-violet-400" />
          <span className="font-medium leading-tight text-violet-100">{meta.name}</span>
        </div>
        <span className="shrink-0 rounded bg-violet-400/10 px-1.5 py-0.5 font-mono text-[10px] text-violet-300/90">{meta.tag}</span>
      </div>

      <div className="space-y-1">
        {id === "crusher" && (
          <>
            <Stat label="Feed Rate" value={s.crusher.feed.toFixed(0)} unit="t/h" />
            <Stat label="Fineness (90µm)" value={s.crusher.fineness.toFixed(1)} unit="% ret." />
          </>
        )}
        {id === "rawMill" && (
          <>
            <Stat label="Feed Rate" value={s.rawMill.feed.toFixed(0)} unit="t/h" />
            <Stat label="Fineness (90µm)" value={s.rawMill.fineness.toFixed(1)} unit="% ret." />
          </>
        )}
        {id === "preheater" && (
          <>
            <Stat label="Top Gas Temp" value={s.preheater.topGasTemp.toFixed(0)} unit="°C" />
            <Stat label="Calcination" value={s.preheater.calcination.toFixed(1)} unit="%" />
          </>
        )}
        {id === "kiln" && (
          <>
            <Stat label="Burning-Zone Temp" value={s.kiln.burnTemp.toFixed(0)} unit="°C" />
            <Stat label="Kiln Torque" value={s.kiln.torque.toFixed(0)} unit="%" />
            <Stat label="Bogue C₃S" value={s.kiln.c3s.toFixed(0)} unit="%" />
          </>
        )}
        {id === "cooler" && (
          <>
            <Stat label="Clinker Discharge" value={s.cooler.clinkerTemp.toFixed(0)} unit="°C" />
            <Stat label="Recup. Efficiency" value={s.cooler.recupEff.toFixed(0)} unit="%" />
          </>
        )}
        {id === "baghouse" && (
          <>
            <Stat label="Dust Emission" value={s.baghouse.dust.toFixed(0)} unit="mg/Nm³" />
            <Stat label="ID Fan Draft" value={s.baghouse.draft.toFixed(1)} unit="mbar" />
          </>
        )}
        {id === "cementMill" && (
          <>
            <Stat label="Final Blaine" value={s.cementMill.blaine.toFixed(0)} unit="cm²/g" />
            <Stat label="Cement Output" value={s.cementMill.output.toFixed(0)} unit="t/h" />
          </>
        )}
      </div>

      <div className="mt-2 border-t border-violet-400/10 pt-1.5 text-[9px] text-slate-600">
        {s.hoveredId === "kiln" || s.hoveredId === "rawMill" || s.hoveredId === "baghouse"
          ? "Click to adjust setpoints · live mock telemetry"
          : "Live mock telemetry"}
      </div>
    </div>
  );
}
