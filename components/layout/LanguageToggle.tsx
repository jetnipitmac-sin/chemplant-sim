"use client";
import { LANGUAGE_LABELS, LANGUAGES } from "@/lib/i18n/config";
import { useSimStore } from "@/store/simStore";

export function LanguageToggle() {
  const lang = useSimStore((s) => s.language);
  const setLanguage = useSimStore((s) => s.setLanguage);
  return (
    <div className="flex overflow-hidden rounded-lg border border-edge">
      {LANGUAGES.map((l) => (
        <button
          key={l}
          onClick={() => setLanguage(l)}
          className={`flex-1 px-3 py-1.5 text-xs font-semibold transition ${
            lang === l ? "bg-brand/20 text-brand" : "text-muted hover:bg-panel-3 hover:text-ink"
          }`}
        >
          {LANGUAGE_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
