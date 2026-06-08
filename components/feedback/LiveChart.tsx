"use client";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { useActiveConfig, useSimStore } from "@/store/simStore";

export function LiveChart() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const data = useSimStore((s) => s.history);
  const series = config.outputs.filter((o) => o.graph);

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{t("common.liveTrend")}</h3>
          <span className="chip">
            <span className="led animate-pulse bg-ok" /> live
          </span>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {series.map((o) => (
            <span key={o.id} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-2 w-3 rounded-sm" style={{ background: o.color }} />
              {t(`output.${o.id}.label`)}
            </span>
          ))}
        </div>
      </div>
      <div className="p-2">
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={data} margin={{ top: 6, right: 10, bottom: 0, left: -14 }}>
            <CartesianGrid stroke="#16202c" strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(v) => Number(v).toFixed(0)}
              stroke="#5b6b7d"
              fontSize={10}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis stroke="#5b6b7d" fontSize={10} width={34} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v) => Number(v).toFixed(0)} />
            <Tooltip
              contentStyle={{ background: "#0f151e", border: "1px solid #243140", borderRadius: 8, fontSize: 12 }}
              labelFormatter={(v) => `t = ${Number(v).toFixed(1)} s`}
              formatter={(val, name) => [Number(val).toFixed(1), t(`output.${String(name)}.label`)]}
            />
            {series.map((o) => (
              <Line key={o.id} type="monotone" dataKey={o.id} stroke={o.color} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
