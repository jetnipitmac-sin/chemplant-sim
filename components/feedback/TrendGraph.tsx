"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useActiveConfig, useSimStore } from "@/store/simStore";
import { ExportButton } from "./ExportButton";
import { CompareButton } from "./CompareButton";
import { withBaseline } from "./baseline";
import { YieldTracker } from "./YieldTracker";
import { CementTrend } from "./CementTrend";
import { GspYieldTracker } from "./GspYieldTracker";

/** A single live trend with warning (yellow) + danger (red) reference lines. */
export function TrendGraph({ outputId, height = 118 }: { outputId: string; height?: number }) {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const data = useSimStore((s) => s.history);
  const baseline = useSimStore((s) => s.baseline);
  const def = config.outputs.find((o) => o.id === outputId);
  const cur = useSimStore((s) => (def ? s.outputs[def.id] : undefined));
  const breached = useSimStore((s) => s.alarms.find((a) => a.id === outputId));
  const chartData = useMemo(() => withBaseline(data, baseline, [outputId]), [data, baseline, outputId]);
  if (!def) return null;

  const color = def.color ?? "#22d3ee";
  const valueColor = breached ? (breached.severity === "critical" ? "#ef4444" : "#f59e0b") : color;

  return (
    <div className={`rounded-lg border bg-panel-2/40 p-2 ${breached?.severity === "critical" ? "animate-pulse border-crit/60" : "border-edge"}`}>
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-xs font-medium text-ink">{t(`output.${outputId}.label`)}</span>
        <span className="stat-value text-xs" style={{ color: valueColor }}>
          {(cur ?? 0).toFixed(def.decimals ?? 0)}
          {def.unit && <span className="ml-0.5 text-[10px] text-muted">{def.unit}</span>}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 4, right: 10, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#16202c" strokeDasharray="3 3" />
          <XAxis
            dataKey="t"
            type="number"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(v) => Number(v).toFixed(0)}
            stroke="#5b6b7d"
            fontSize={9}
            tickLine={false}
            minTickGap={26}
          />
          <YAxis stroke="#5b6b7d" fontSize={9} width={30} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v) => Number(v).toFixed(0)} />
          <Tooltip
            contentStyle={{ background: "#0f151e", border: "1px solid #243140", borderRadius: 8, fontSize: 11 }}
            labelFormatter={(v) => `t = ${Number(v).toFixed(1)} s`}
            formatter={(val) => [Number(val).toFixed(def.decimals ?? 1), t(`output.${outputId}.label`)]}
          />
          {def.warnLimit !== undefined && (
            <ReferenceLine y={def.warnLimit} stroke="#f59e0b" strokeDasharray="5 3" strokeOpacity={0.9} label={{ value: t("common.warning"), fill: "#f59e0b", fontSize: 9, position: "insideTopRight" }} />
          )}
          {def.dangerLimit !== undefined && (
            <ReferenceLine y={def.dangerLimit} stroke="#ef4444" strokeDasharray="5 3" strokeOpacity={0.95} label={{ value: t("common.danger"), fill: "#ef4444", fontSize: 9, position: "insideBottomRight" }} />
          )}
          {baseline && (
            <Line type="monotone" dataKey={`__b_${outputId}`} stroke={color} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          )}
          <Line type="monotone" dataKey={outputId} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Live trend section. Each process gets a tailored DCS-style view:
 *   • oil    → interactive 8-cut YieldTracker (+ ΔP / COT safety lines)
 *   • cement → multi-Y-axis kiln trend (C₂S / Torque / CO / Sp.Heat)
 *   • cstr   → one trend per graphed output (generic)
 */
export function TrendPanel() {
  const { t } = useTranslation();
  const config = useActiveConfig();

  if (config.id === "oil") return <YieldTracker />;
  if (config.id === "cement") return <CementTrend />;
  if (config.id === "gsp") return <GspYieldTracker />;

  const graphed = config.outputs.filter((o) => o.graph);
  return (
    <section className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{t("common.trends")}</h3>
          <span className="chip">
            <span className="led animate-pulse bg-ok" /> live
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <CompareButton />
          <ExportButton />
        </div>
      </div>
      <div className="space-y-2 p-2">
        {graphed.map((o) => (
          <TrendGraph key={o.id} outputId={o.id} />
        ))}
      </div>
    </section>
  );
}
