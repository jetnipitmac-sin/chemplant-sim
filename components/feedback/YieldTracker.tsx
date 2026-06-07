"use client";
/**
 * Oil Refining — DCS-style yield tracker. A grid of 8 clickable cut pills (live
 * yields) selects which fraction is plotted; the live trend shows that cut
 * alongside the two safety metrics — Column ΔP (flooding) and Coil-Outlet Temp
 * (cracking) — each with a red danger ReferenceLine. Real-time from the store
 * history buffer.
 */
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSimStore } from "@/store/simStore";
import { computeCuts } from "@/store/refineryStore";
import { ExportButton } from "./ExportButton";
import { CompareButton } from "./CompareButton";
import { withBaseline } from "./baseline";

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function YieldTracker() {
  const oilP = useSimStore((s) => s.params.oil);
  const data = useSimStore((s) => s.history);
  const baseline = useSimStore((s) => s.baseline);
  const deltaP = useSimStore((s) => s.outputs.oilDeltaP ?? 0);
  const cot = useSimStore((s) => s.outputs.oilCOT ?? 0);
  const [selected, setSelected] = useState("gasoline");

  // live yields of all 8 cuts — show the lagged actual value (from the trend buffer)
  // so the pills match the ramping chart; fall back to the steady-state target.
  const cuts = useMemo(() => {
    const eff = oilP.oilFeedRate * ((oilP.crudePumpSpeed ?? 80) / 80);
    const vd = clamp(1 - (oilP.oilFurnaceTemp - 300) / Math.max(eff * 0.38, 1), 0, 1);
    const lp = clamp(1 - (oilP.airCoolerRpm ?? 1200) / 1100, 0, 1);
    const last = data[data.length - 1];
    return computeCuts(oilP.oilFurnaceTemp, { vaporDeficit: vd, lightPenalty: lp }).map((c) => ({
      ...c,
      pct: (last?.[`cut_${c.key}`] as number) ?? c.pct,
    }));
  }, [oilP.oilFurnaceTemp, oilP.oilFeedRate, oilP.crudePumpSpeed, oilP.airCoolerRpm, data]);

  const sel = cuts.find((c) => c.key === selected) ?? cuts[1];
  const chartData = useMemo(() => withBaseline(data, baseline, [`cut_${selected}`]), [data, baseline, selected]);

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">Yield Tracker</h3>
          <span className="chip">
            <span className="led animate-pulse bg-ok" /> live
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CompareButton />
          <ExportButton />
        </div>
      </div>

      {/* 8 selectable cut pills (live yields) */}
      <div className="grid grid-cols-4 gap-1.5 p-2">
        {cuts.map((c) => {
          const on = c.key === selected;
          return (
            <button
              key={c.key}
              onClick={() => setSelected(c.key)}
              className={`rounded-lg border px-2 py-1.5 text-left transition ${
                on ? "border-brand bg-brand/20 shadow-[0_0_12px] shadow-brand/30" : "border-edge bg-panel-2/40 hover:border-brand/40"
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: c.color }} />
                <span className={`truncate text-[10px] ${on ? "text-brand" : "text-muted"}`}>{c.name.split(" / ")[0]}</span>
              </div>
              <div className={`font-mono text-xs tabular-nums ${on ? "text-ink" : "text-ink/70"}`}>{c.pct.toFixed(1)}%</div>
            </button>
          );
        })}
      </div>

      {/* live value chips for the selected cut + the two safety metrics */}
      <div className="grid grid-cols-3 gap-1.5 px-2">
        {[
          { label: sel.name.split(" / ")[0], val: `${sel.pct.toFixed(1)}%`, color: sel.color, alarm: false },
          { label: "Column ΔP", val: `${deltaP.toFixed(1)} mbar`, color: "#fb923c", alarm: deltaP >= 12 },
          { label: "Coil Outlet T", val: `${cot.toFixed(0)} °C`, color: "#f43f5e", alarm: cot >= 370 },
        ].map((m) => (
          <div key={m.label} className={`rounded-lg border bg-panel-2/40 px-2 py-1 ${m.alarm ? "border-crit/60 animate-pulse" : "border-edge"}`}>
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: m.color }} />
              <span className="truncate text-[9px] uppercase tracking-wide text-muted">{m.label}</span>
            </div>
            <div className="font-mono text-sm tabular-nums" style={{ color: m.alarm ? "#ef4444" : "#e6edf5" }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* live trend: selected cut (auto-scaled) + ΔP + COT, each on its own scale */}
      <div className="px-2 pb-2 pt-2">
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={chartData} margin={{ top: 8, right: 6, bottom: 2, left: -18 }}>
            <CartesianGrid stroke="#16202c" strokeDasharray="3 3" />
            <XAxis dataKey="t" type="number" domain={["dataMin", "dataMax"]} tickFormatter={(v) => `${Number(v).toFixed(0)}s`} stroke="#5b6b7d" fontSize={9} tickLine={false} minTickGap={28} />
            {/* left: selected cut yield (auto-scaled so it always fills the plot) */}
            <YAxis yAxisId="yield" stroke={sel.color} fontSize={9} width={28} tickLine={false} domain={[0, "auto"]} tickCount={6} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: "yield %", angle: 0, position: "insideTopLeft", fill: sel.color, fontSize: 9, dy: -6 }} />
            {/* right: coil-outlet temperature */}
            <YAxis yAxisId="temp" orientation="right" stroke="#f43f5e" fontSize={9} width={32} tickLine={false} domain={[300, 410]} tickCount={6} tickFormatter={(v) => Number(v).toFixed(0)} label={{ value: "°C", angle: 0, position: "insideTopRight", fill: "#f43f5e", fontSize: 9, dy: -6 }} />
            {/* hidden: column ΔP (own scale so it can't distort the yield axis) */}
            <YAxis yAxisId="dp" orientation="right" domain={[0, 18]} hide />
            <Tooltip contentStyle={{ background: "#0f151e", border: "1px solid #243140", borderRadius: 8, fontSize: 11 }} labelFormatter={(v) => `t = ${Number(v).toFixed(1)} s`} />
            {/* danger reference lines (always visible on their own axes) */}
            <ReferenceLine yAxisId="dp" y={12} stroke="#fb923c" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "Flooding ΔP", fill: "#fb923c", fontSize: 9, position: "insideBottomRight" }} />
            <ReferenceLine yAxisId="temp" y={370} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={1.5} label={{ value: "Cracking >370°C", fill: "#ef4444", fontSize: 9, position: "insideTopRight" }} />
            {baseline && (
              <Line yAxisId="yield" type="monotone" dataKey={`__b_cut_${selected}`} stroke={sel.color} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
            )}
            <Line yAxisId="yield" type="monotone" dataKey={`cut_${selected}`} stroke={sel.color} strokeWidth={2.6} dot={false} isAnimationActive={false} />
            <Line yAxisId="dp" type="monotone" dataKey="oilDeltaP" stroke="#fb923c" strokeWidth={1.6} strokeDasharray="4 2" dot={false} isAnimationActive={false} />
            <Line yAxisId="temp" type="monotone" dataKey="oilCOT" stroke="#f43f5e" strokeWidth={1.6} strokeDasharray="2 2" dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
