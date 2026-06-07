"use client";
/**
 * Cement Manufacturing — multi-Y-axis live kiln trend (real-time, from the store
 * history buffer). To keep every pen readable, each scale gets its own axis:
 *   • left  (%)        → Belite C₂S and Kiln Torque
 *   • right (ppm)      → Exhaust CO, with the red 500 ppm danger ReferenceLine
 *   • hidden (kcal/kg) → Specific Heat (own scale, so it can't crush the CO line)
 */
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSimStore } from "@/store/simStore";
import { ExportButton } from "./ExportButton";
import { CompareButton } from "./CompareButton";
import { withBaseline } from "./baseline";

const SERIES = [
  { key: "cementC2S", label: "Belite C₂S", unit: "%", color: "#60a5fa", axis: "pct" as const },
  { key: "cementTorque", label: "Kiln Torque", unit: "%", color: "#f59e0b", axis: "pct" as const },
  { key: "cementCO", label: "Exhaust CO", unit: "ppm", color: "#ef4444", axis: "co" as const },
  { key: "cementSpecHeat", label: "Sp. Heat", unit: "kcal/kg", color: "#22d3ee", axis: "heat" as const },
];

export function CementTrend() {
  const data = useSimStore((s) => s.history);
  const baseline = useSimStore((s) => s.baseline);
  const out = useSimStore((s) => s.outputs);
  const chartData = useMemo(() => withBaseline(data, baseline, SERIES.map((s) => s.key)), [data, baseline]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">Kiln Trends</h3>
          <span className="chip">
            <span className="led animate-pulse bg-ok" /> live
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CompareButton />
          <ExportButton />
        </div>
      </div>

      {/* live value chips — at-a-glance readout for each pen */}
      <div className="grid grid-cols-2 gap-1.5 px-2 pt-2 sm:grid-cols-4">
        {SERIES.map((s) => {
          const v = out[s.key] ?? 0;
          const hot = s.key === "cementCO" && v >= 500;
          const warn = s.key === "cementCO" && v >= 400;
          return (
            <div key={s.key} className={`rounded-lg border bg-panel-2/40 px-2 py-1 ${hot ? "border-crit/60 animate-pulse" : "border-edge"}`}>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                <span className="truncate text-[9px] uppercase tracking-wide text-muted">{s.label}</span>
              </div>
              <div className="font-mono text-sm tabular-nums" style={{ color: hot ? "#ef4444" : warn ? "#f59e0b" : "#e6edf5" }}>
                {v.toFixed(s.unit === "%" ? 0 : 0)}
                <span className="ml-0.5 text-[9px] text-muted">{s.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-2 pb-2 pt-2">
        <ResponsiveContainer width="100%" height={236}>
          <LineChart data={chartData} margin={{ top: 8, right: 6, bottom: 2, left: -16 }}>
            <CartesianGrid stroke="#16202c" strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => `${Number(v).toFixed(0)}s`} stroke="#5b6b7d" fontSize={9} tickLine={false} minTickGap={28} />
            <YAxis yAxisId="pct" stroke="#7c8896" fontSize={9} width={26} tickLine={false} domain={[0, 100]} tickCount={6} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: "%", angle: 0, position: "insideTopLeft", fill: "#7c8896", fontSize: 9, dy: -6 }} />
            <YAxis yAxisId="co" orientation="right" stroke="#ef4444" fontSize={9} width={34} tickLine={false} domain={[0, 800]} tickCount={5} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: "ppm", angle: 0, position: "insideTopRight", fill: "#ef4444", fontSize: 9, dy: -6 }} />
            <YAxis yAxisId="heat" orientation="right" domain={[650, 1320]} hide />
            <Tooltip contentStyle={{ background: "#0f151e", border: "1px solid #243140", borderRadius: 8, fontSize: 11 }} labelFormatter={(v) => `t = ${Number(v).toFixed(1)} s`} />
            {/* CO danger limit — now prominent on its own 0–800 ppm axis */}
            <ReferenceLine yAxisId="co" y={500} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "CO danger 500 ppm", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
            {baseline &&
              SERIES.map((s) => (
                <Line key={`b-${s.key}`} yAxisId={s.axis} type="monotone" dataKey={`__b_${s.key}`} stroke={s.color} strokeOpacity={0.3} strokeWidth={1.3} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              ))}
            {SERIES.map((s) => (
              <Line key={s.key} yAxisId={s.axis} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
