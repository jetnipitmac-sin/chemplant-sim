"use client";
import { useTranslation } from "react-i18next";
import { useActiveConfig, useSimStore } from "@/store/simStore";

/** Export the live rolling trend buffer (all graphed series) to CSV. */
export function ExportButton() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const exportCsv = () => {
    const history = useSimStore.getState().history;
    const keys = new Set<string>();
    history.forEach((row) => Object.keys(row).forEach((k) => k !== "t" && keys.add(k)));
    const cols = [...keys];
    const header = ["t_sec", ...cols].join(",");
    const rows = history.map((p) => [p.t, ...cols.map((c) => (p[c] ?? "").toString())].join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prosim-${config.id}-trend.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button className="btn px-2 py-1 text-xs" onClick={exportCsv} title={t("common.exportCsv")}>
      ⭳ {t("common.exportCsv")}
    </button>
  );
}
