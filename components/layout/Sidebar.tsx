"use client";
import { useTranslation } from "react-i18next";
import { PROCESS_ORDER, PROCESSES } from "@/lib/processes";
import { useSimStore } from "@/store/simStore";
import { LanguageToggle } from "./LanguageToggle";
import { ShareButton } from "./ShareButton";

export function Sidebar() {
  const { t } = useTranslation();
  const active = useSimStore((s) => s.activeProcessId);
  const setProcess = useSimStore((s) => s.setActiveProcess);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-edge bg-panel/60 backdrop-blur">
      <div className="flex h-14 items-center gap-3 border-b border-edge px-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-lg text-brand shadow-glow">⬡</div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">{t("common.appName")}</div>
          <div className="truncate text-[10px] leading-tight text-muted">{t("common.appTagline")}</div>
        </div>
      </div>

      <div className="px-3 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-wider text-muted">
        {t("common.selectProcess")}
      </div>
      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3">
        {PROCESS_ORDER.map((id) => {
          const cfg = PROCESSES[id];
          const on = active === id;
          return (
            <button
              key={id}
              onClick={() => setProcess(id)}
              className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                on ? "border-transparent" : "border-edge hover:border-brand/40 hover:bg-panel-2"
              }`}
              style={
                on
                  ? { borderColor: `${cfg.accent}66`, background: `${cfg.accent}14`, boxShadow: `0 0 22px -8px ${cfg.accent}` }
                  : undefined
              }
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-panel-3 text-lg"
                style={on ? { background: `${cfg.accent}22` } : undefined}
              >
                {cfg.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium" style={{ color: on ? cfg.accent : undefined }}>
                  {t(`process.${id}.name`)}
                </span>
                <span className="block truncate text-[11px] text-muted">{t(`process.${id}.tagline`)}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-edge p-3">
        <ShareButton />
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{t("common.language")}</div>
        <LanguageToggle />
      </div>

      {/* author / portfolio branding */}
      <footer className="border-t border-edge px-4 py-3 text-center leading-tight">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">Designed &amp; Developed by</div>
        <div className="mt-0.5 text-sm font-semibold text-slate-300">Jetnipit Sinwisitsophon</div>
        <div className="mt-1 text-[10px] text-slate-500">Mahidol University Chemical Engineering</div>
      </footer>
    </aside>
  );
}
