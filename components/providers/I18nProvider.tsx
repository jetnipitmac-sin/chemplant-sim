"use client";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n/config";
import { useSimStore } from "@/store/simStore";

/** Wraps the app in the i18next context and restores the persisted language. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const setLanguage = useSimStore((s) => s.setLanguage);
  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("lang") : null;
    if (saved === "th" || saved === "en") setLanguage(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
