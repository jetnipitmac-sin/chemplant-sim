"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSimStore } from "@/store/simStore";
import { encodeRun } from "@/lib/share";

/** Copies a shareable URL that restores the current process + setpoints + language. */
export function ShareButton() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const s = useSimStore.getState();
    const enc = encodeRun({ p: s.activeProcessId, v: s.params[s.activeProcessId], l: s.language });
    const url = `${window.location.origin}${window.location.pathname}?run=${enc}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button onClick={share} className="btn w-full text-xs">
      {copied ? `✓ ${t("common.copied")}` : `🔗 ${t("common.shareRun")}`}
    </button>
  );
}
