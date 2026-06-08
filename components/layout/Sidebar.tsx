"use client";
import { useTranslation } from "react-i18next";
import { PROCESS_ORDER, PROCESSES } from "@/lib/processes";
import { useSimStore } from "@/store/simStore";
import { ProcessIcon } from "@/components/icons/ProcessIcon";
import { LanguageToggle } from "./LanguageToggle";
import { ShareButton } from "./ShareButton";

export function Sidebar({ open = false, onClose }: { open?: boolean; onClose?: () => void }) {
  const { t } = useTranslation();
  const active = useSimStore((s) => s.activeProcessId);
  const setProcess = useSimStore((s) => s.setActiveProcess);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full w-64 max-w-[80vw] shrink-0 flex-col border-r border-edge bg-panel/95 backdrop-blur transition-transform duration-300 ${
        open ? "translate-x-0" : "-translate-x-full"
      } xl:static xl:z-auto xl:max-w-none xl:translate-x-0 xl:bg-panel/60`}
    >
      <div className="flex h-14 items-center gap-3 border-b border-edge px-4">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/15 text-lg text-brand shadow-glow">⬡</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight">{t("common.appName")}</div>
          <div className="truncate text-[10px] leading-tight text-muted">{t("common.appTagline")}</div>
        </div>
        <button onClick={onClose} className="shrink-0 px-1 text-muted hover:text-ink xl:hidden" aria-label="Close menu">✕</button>
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
              onClick={() => { setProcess(id); onClose?.(); }}
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
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-panel-3"
                style={{ background: `${cfg.accent}${on ? "22" : "14"}` }}
              >
                <ProcessIcon id={id} className="h-5 w-5" style={{ color: cfg.accent }} />
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
