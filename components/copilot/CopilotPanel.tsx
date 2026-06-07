"use client";
/**
 * "Chief Engineer" AI copilot. A floating assistant that, on every message,
 * snapshots the live Zustand simulator state via buildCopilotContext() and POSTs
 * it to /api/copilot (LLM or local rule-engine) for state-aware advice.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildCopilotContext } from "@/lib/copilot/context";
import { proactiveAdvice } from "@/lib/copilot/advisor";
import { useSimStore } from "@/store/simStore";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export function CopilotPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: t("common.copilotIntro") }]);
  const [proactive, setProactive] = useState(true);
  const [unread, setUnread] = useState(false);
  const seenCrit = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const alarms = useSimStore((s) => s.alarms);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [msgs, busy]);

  // Proactive auto-advice: when a NEW critical alarm appears, the copilot speaks up.
  useEffect(() => {
    const critIds = alarms.filter((a) => a.severity === "critical").map((a) => a.id);
    if (proactive) {
      const fresh = critIds.filter((id) => !seenCrit.current.has(id));
      if (fresh.length) {
        const advice = proactiveAdvice(buildCopilotContext());
        if (advice) {
          setMsgs((m) => [...m, { role: "assistant", content: advice }]);
          if (!open) setUnread(true);
        }
      }
    }
    seenCrit.current = new Set(critIds);
  }, [alarms, proactive, open]);

  // clear the unread badge once the panel is opened
  useEffect(() => {
    if (open) setUnread(false);
  }, [open]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const context = buildCopilotContext(); // ← reads live Zustand state
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context }),
      });
      const j = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: j.reply ?? "…" }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "(offline)" }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full bg-brand text-xl text-base shadow-glow transition hover:scale-105"
        title={t("common.copilot")}
        aria-label={t("common.copilot")}
      >
        🤖
        {unread && !open && (
          <>
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 animate-ping rounded-full bg-crit" />
            <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-crit ring-2 ring-base" />
          </>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[30rem] w-[22rem] animate-fade-in flex-col overflow-hidden rounded-xl border border-edge bg-panel shadow-panel">
          <header className="flex items-center justify-between border-b border-edge px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/15 text-brand">🤖</span>
              <div>
                <div className="text-sm font-semibold leading-tight">{t("common.copilot")}</div>
                <div className="text-[10px] leading-tight text-muted">{t("common.copilotSub")}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setProactive((p) => !p)}
                className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition ${proactive ? "border-ok/40 bg-ok/10 text-ok" : "border-edge text-muted hover:text-ink"}`}
                title={t("common.copilotAuto")}
              >
                ⚡ {t("common.auto")}
              </button>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="close">
                ✕
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user" ? "bg-brand/20 text-ink" : "border border-edge bg-panel-2 text-ink/90"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <div className="px-1 text-xs text-muted">{t("common.copilotThinking")}</div>}
          </div>

          <div className="flex flex-wrap gap-1 px-3 pb-1">
            <button className="chip hover:border-brand/50" onClick={() => send("diagnose alarms")}>
              {t("common.copilotDiagnose")}
            </button>
            <button className="chip hover:border-brand/50" onClick={() => send("improve profit")}>
              {t("common.copilotProfit")}
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-edge p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("common.copilotPlaceholder")}
              className="min-w-0 flex-1 rounded-lg border border-edge bg-panel-2 px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-brand/50"
            />
            <button type="submit" disabled={busy} className="btn btn-primary px-3" aria-label={t("common.send")}>
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
