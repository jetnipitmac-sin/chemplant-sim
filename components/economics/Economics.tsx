"use client";
import { useTranslation } from "react-i18next";
import { useSimStore } from "@/store/simStore";

const money = (v: number) => `$${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const co2fmt = (kg: number) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)} t/hr` : `${kg.toFixed(0)} kg/hr`);
const ecoColor = (s: number) => (s >= 70 ? "#34d399" : s >= 45 ? "#f59e0b" : "#ef4444");

/** Compact header badge: sustainability score with a leaf. */
export function EcoBadge() {
  const sus = useSimStore((s) => s.sustainability);
  if (!sus) return null;
  const color = ecoColor(sus.score);
  return (
    <div className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5" style={{ borderColor: `${color}66` }}>
      <span style={{ color }}>🌱</span>
      <div className="stat-value text-sm leading-none" style={{ color }}>
        {sus.score.toFixed(0)}
        <span className="ml-0.5 text-[10px] text-muted">eco</span>
      </div>
    </div>
  );
}

function Sparkline({ pts, color }: { pts: number[]; color: string }) {
  if (pts.length < 2) return <svg width={64} height={26} />;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const r = max - min || 1;
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * 64},${26 - ((v - min) / r) * 22 - 2}`).join(" ");
  return (
    <svg width={64} height={26} className="shrink-0">
      <polyline points={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

/** Glowing "stock ticker" of live $/hr profit, with a profit sparkline. */
export function EconomicsTicker() {
  const { t } = useTranslation();
  const profit = useSimStore((s) => s.economics?.profit ?? 0);
  const history = useSimStore((s) => s.history);
  const up = profit >= 0;
  const color = up ? "#34d399" : "#ef4444";
  const pts = history.slice(-30).map((p) => p.profit ?? 0);

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-1.5 ${up ? "border-ok/40 bg-ok/5" : "border-crit/50 bg-crit/10"}`}
      style={{ boxShadow: `0 0 18px -6px ${color}` }}
      title={t("common.economicsSub")}
    >
      <div>
        <div className="text-[9px] uppercase tracking-wider text-muted">{t("common.profit")}</div>
        <div className="stat-value text-base leading-none" style={{ color }}>
          {up ? "▲" : "▼"} {money(profit)}
          <span className="ml-0.5 text-[10px] text-muted">/hr</span>
        </div>
      </div>
      <Sparkline pts={pts} color={color} />
    </div>
  );
}

function Row({ label, value, sign, tone }: { label: string; value: number; sign: string; tone: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      <span className={`stat-value text-sm ${tone}`}>
        {sign}
        {money(value)}
        <span className="ml-0.5 text-[10px] text-muted">/hr</span>
      </span>
    </div>
  );
}

/** Full P&L breakdown for the right panel. */
export function EconomicsPanel() {
  const { t } = useTranslation();
  const eco = useSimStore((s) => s.economics);
  const sus = useSimStore((s) => s.sustainability);
  if (!eco) return null;
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("common.economics")}</h3>
          <p className="text-[11px] text-muted">{t("common.economicsSub")}</p>
        </div>
      </div>
      <div className="divide-y divide-edge/60">
        <Row label={t("common.revenue")} value={eco.revenue} sign="+" tone="text-ok" />
        <Row label={t("common.feedCost")} value={eco.feedCost} sign="−" tone="text-ink/80" />
        <Row label={t("common.energyCost")} value={eco.energyCost} sign="−" tone="text-ink/80" />
        <Row label={t("common.coolingCost")} value={eco.coolingCost} sign="−" tone="text-ink/80" />
        <div className="flex items-center justify-between bg-panel-2/40 px-3 py-2.5">
          <span className="text-sm font-semibold text-ink">{t("common.profit")}</span>
          <span className={`stat-value text-base ${eco.profit >= 0 ? "text-ok" : "text-crit"}`}>
            {eco.profit >= 0 ? "+" : "−"}
            {money(eco.profit)}
            <span className="ml-0.5 text-[10px] text-muted">/hr</span>
          </span>
        </div>
        {sus && (
          <>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs text-muted">🌱 {t("common.co2")}</span>
              <span className="stat-value text-sm text-ink/80">{co2fmt(sus.co2)}</span>
            </div>
            <div className="px-3 py-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-muted">{t("common.sustainability")}</span>
                <span className="stat-value text-sm" style={{ color: ecoColor(sus.score) }}>
                  {sus.score.toFixed(0)}/100
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panel-3">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${sus.score}%`, background: ecoColor(sus.score) }} />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
