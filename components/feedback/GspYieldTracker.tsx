"use client";
/**
 * Gas Separation Plant — DCS-style product yield tracker. Five clickable product
 * pills (Sales Gas C₁ · Ethane C₂ · Propane C₃ · Butane C₄ · Condensate C₅₊)
 * select which yield is plotted live; the trend overlays the two safety metrics —
 * CO₂ Slip (ppm, with a red 50 ppm "off-spec" ReferenceLine) and Compression
 * Power (MW) — each on its own Y-axis. Real-time from the store history buffer.
 */
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSimStore } from "@/store/simStore";
import { ExportButton } from "./ExportButton";
import { CompareButton } from "./CompareButton";
import { withBaseline } from "./baseline";

const PRODUCTS = [
  { key: "gspSalesGas", name: "Sales Gas", carbon: "C₁", color: "#a3e635" },
  { key: "gspEthane", name: "Ethane", carbon: "C₂", color: "#22d3ee" },
  { key: "gspPropane", name: "Propane", carbon: "C₃", color: "#fb923c" },
  { key: "gspButane", name: "Butane", carbon: "C₄", color: "#c084fc" },
  { key: "gspCondensate", name: "Condensate", carbon: "C₅₊", color: "#f43f5e" },
] as const;

export function GspYieldTracker() {
  const data = useSimStore((s) => s.history);
  const baseline = useSimStore((s) => s.baseline);
  const outputs = useSimStore((s) => s.outputs);
  const co2 = outputs.gspCO2Slip ?? 0;
  const power = outputs.gspCompPower ?? 0;
  const [selected, setSelected] = useState<string>("gspEthane");

  const sel = PRODUCTS.find((p) => p.key === selected) ?? PRODUCTS[1];
  const chartData = useMemo(() => withBaseline(data, baseline, [selected]), [data, baseline, selected]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">Product Yields</h3>
          <span className="chip">
            <span className="led animate-pulse bg-ok" /> live
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CompareButton />
          <ExportButton />
        </div>
      </div>

      {/* 5 selectable product pills (live yields) */}
      <div className="grid grid-cols-5 gap-1.5 p-2">
        {PRODUCTS.map((p) => {
          const on = p.key === selected;
          const val = (outputs[p.key] as number) ?? 0;
          return (
            <button
              key={p.key}
              onClick={() => setSelected(p.key)}
              className={`rounded-lg border px-2 py-1.5 text-left transition ${
                on ? "border-brand bg-brand/20 shadow-[0_0_12px] shadow-brand/30" : "border-edge bg-panel-2/40 hover:border-brand/40"
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: p.color }} />
                <span className={`truncate text-[10px] ${on ? "text-brand" : "text-muted"}`}>{p.carbon}</span>
              </div>
              <div className={`truncate text-[9px] ${on ? "text-ink/80" : "text-muted/70"}`}>{p.name}</div>
              <div className={`font-mono text-xs tabular-nums ${on ? "text-ink" : "text-ink/70"}`}>{val.toFixed(1)}%</div>
            </button>
          );
        })}
      </div>

      {/* live value chips: selected yield + the two safety metrics */}
      <div className="grid grid-cols-3 gap-1.5 px-2">
        {[
          { label: `${sel.name} (${sel.carbon})`, val: `${((outputs[sel.key] as number) ?? 0).toFixed(1)}%`, color: sel.color, alarm: false },
          { label: "CO₂ Slip", val: `${co2.toFixed(0)} ppm`, color: "#ef4444", alarm: co2 >= 50 },
          { label: "Compression", val: `${power.toFixed(1)} MW`, color: "#f59e0b", alarm: false },
        ].map((m) => (
          <div key={m.label} className={`rounded-lg border bg-panel-2/40 px-2 py-1 ${m.alarm ? "animate-pulse border-crit/60" : "border-edge"}`}>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: m.color }} />
              <span className="truncate text-[9px] uppercase tracking-wide text-muted">{m.label}</span>
            </div>
            <div className="font-mono text-sm tabular-nums" style={{ color: m.alarm ? "#ef4444" : "#e6edf5" }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* live trend: selected yield (auto-scaled) + CO₂ slip + compression power, each on its own scale */}
      <div className="px-2 pb-2 pt-2">
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={chartData} margin={{ top: 8, right: 6, bottom: 2, left: -18 }}>
            <CartesianGrid stroke="#16202c" strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => `${Number(v).toFixed(0)}s`} stroke="#5b6b7d" fontSize={9} tickLine={false} minTickGap={28} />
            {/* left: selected product yield (auto-scaled) */}
            <YAxis yAxisId="yield" stroke={sel.color} fontSize={9} width={28} tickLine={false} domain={[0, "auto"]} tickCount={6} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: "yield %", angle: 0, position: "insideTopLeft", fill: sel.color, fontSize: 9, dy: -6 }} />
            {/* right: CO₂ slip (ppm) with the off-spec danger line */}
            <YAxis yAxisId="co2" orientation="right" stroke="#ef4444" fontSize={9} width={34} tickLine={false} domain={[0, (max: number) => Math.max(70, Math.ceil(max * 1.15))]} tickCount={6} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: "ppm", angle: 0, position: "insideTopRight", fill: "#ef4444", fontSize: 9, dy: -6 }} />
            {/* hidden: compression power (own scale so it can't distort the yield axis) */}
            <YAxis yAxisId="power" orientation="right" domain={[0, 45]} hide />
            <Tooltip contentStyle={{ background: "#0f151e", border: "1px solid #243140", borderRadius: 8, fontSize: 11 }} labelFormatter={(v) => `t = ${Number(v).toFixed(1)} s`} />
            {/* off-spec danger reference line (always visible on the CO₂ axis) */}
            <ReferenceLine yAxisId="co2" y={50} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "Danger: High CO₂ Slip", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
            {baseline && (
              <Line yAxisId="yield" type="monotone" dataKey={`__b_${selected}`} stroke={sel.color} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            )}
            <Line yAxisId="yield" type="monotone" dataKey={selected} stroke={sel.color} strokeWidth={2.6} dot={false} isAnimationActive={false} />
            <Line yAxisId="co2" type="monotone" dataKey="gspCO2Slip" stroke="#ef4444" strokeWidth={1.6} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
            <Line yAxisId="power" type="monotone" dataKey="gspCompPower" stroke="#f59e0b" strokeWidth={1.6} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
