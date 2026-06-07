"use client";
/**
 * Print-friendly operating report. Always mounted but hidden on screen
 * (`hidden print:block`); the rest of the app is `print:hidden`, so window.print()
 * yields a clean one-page snapshot of the live run: setpoints, outputs, alarms,
 * P&L and emissions. No external PDF dependency — the browser's Save-as-PDF.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useActiveConfig, useSimStore } from "@/store/simStore";
import { paramSeverity } from "@/lib/processes";

export function PrintReport() {
  const { t } = useTranslation();
  const cfg = useActiveConfig();
  const params = useSimStore((s) => s.params[s.activeProcessId]);
  const outputs = useSimStore((s) => s.outputs);
  const alarms = useSimStore((s) => s.alarms);
  const eco = useSimStore((s) => s.economics);
  const sus = useSimStore((s) => s.sustainability);
  const scenario = useSimStore((s) => s.scenario);
  const sevOf = (id: string) => alarms.find((a) => a.id === id)?.severity;
  const f = (n: number | undefined, d = 0) => (n ?? 0).toFixed(d);

  // client-only timestamp (avoids an SSR/hydration mismatch); refresh on print
  const [stamp, setStamp] = useState("");
  useEffect(() => {
    const update = () => setStamp(new Date().toLocaleString());
    update();
    window.addEventListener("beforeprint", update);
    return () => window.removeEventListener("beforeprint", update);
  }, []);

  return (
    <div id="print-report" className="hidden bg-white p-8 text-[11px] leading-relaxed text-black print:block">
      <div className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
        <div>
          <h1 className="text-xl font-bold">ProSim Studio — Operating Report</h1>
          <div className="text-sm">
            {t(`process.${cfg.id}.name`)} · {t(`process.${cfg.id}.tagline`)}
          </div>
        </div>
        <div className="text-right text-[10px]">{stamp}</div>
      </div>

      <h2 className="mb-1 mt-3 text-sm font-bold">Control Setpoints</h2>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-black">
            <th className="py-0.5">Parameter</th>
            <th>Value</th>
            <th>Optimal band</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {cfg.params.map((p) => {
            const v = params[p.id];
            const sev = paramSeverity(p, v).severity;
            return (
              <tr key={p.id} className="border-b border-gray-300">
                <td className="py-0.5">{t(`param.${p.id}.label`)}</td>
                <td>{(v ?? 0).toFixed(p.decimals ?? 0)} {p.unit}</td>
                <td>{p.optimalMin}–{p.optimalMax} {p.unit}</td>
                <td className="font-semibold">{sev === "optimal" ? "OK" : sev.toUpperCase()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mb-1 mt-3 text-sm font-bold">Process Outputs</h2>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-black">
            <th className="py-0.5">Output</th>
            <th>Value</th>
            <th>Limits</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {cfg.outputs.map((o) => {
            const sev = sevOf(o.id);
            const limits = [o.warnLimit !== undefined ? `warn ${o.warnLimit}` : null, o.dangerLimit !== undefined ? `danger ${o.dangerLimit}` : null].filter(Boolean).join(" · ");
            return (
              <tr key={o.id} className="border-b border-gray-300">
                <td className="py-0.5">{t(`output.${o.id}.label`)}</td>
                <td>{(outputs[o.id] ?? 0).toFixed(o.decimals ?? 0)} {o.unit}</td>
                <td>{limits || "—"}</td>
                <td className="font-semibold">{sev ? sev.toUpperCase() : "OK"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mb-1 mt-3 text-sm font-bold">Active Alarms</h2>
      {alarms.length ? (
        <ul className="ml-4 list-disc">
          {alarms.map((a, i) => (
            <li key={i}>
              [{a.severity.toUpperCase()}] {t(`${a.kind}.${a.id}.label`)} {a.direction} at {a.value.toFixed(1)} (limit {a.limit})
            </li>
          ))}
        </ul>
      ) : (
        <div>None — all guarded variables within limits.</div>
      )}

      <div className="mt-3 flex gap-12">
        <div>
          <h2 className="mb-1 text-sm font-bold">Economics ($/hr)</h2>
          {eco && (
            <table className="border-collapse text-left">
              <tbody>
                <tr><td className="pr-6">Revenue</td><td>+{f(eco.revenue)}</td></tr>
                <tr><td>Feed / fuel</td><td>−{f(eco.feedCost)}</td></tr>
                <tr><td>Energy</td><td>−{f(eco.energyCost)}</td></tr>
                <tr><td>Cooling / aux</td><td>−{f(eco.coolingCost)}</td></tr>
                <tr className="border-t border-black font-bold">
                  <td>Profit</td>
                  <td>{eco.profit >= 0 ? "+" : "−"}{f(Math.abs(eco.profit))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div>
          <h2 className="mb-1 text-sm font-bold">Sustainability</h2>
          {sus && (
            <div>
              CO₂: {f(sus.co2)} kg/hr<br />
              Intensity: {f(sus.intensity, 1)}<br />
              Score: {sus.score.toFixed(0)} / 100
            </div>
          )}
        </div>
      </div>

      {scenario && (
        <div className="mt-3">
          <b>Mission:</b> {t(`scenario.${scenario.id}.title`)} — {scenario.status}
          {scenario.score ? ` · score ${scenario.score}` : ""}
        </div>
      )}

      <div className="mt-6 border-t border-gray-400 pt-1 text-[9px] text-gray-500">
        Generated by ProSim Studio — educational simulator. Values are model estimates.
      </div>
    </div>
  );
}
