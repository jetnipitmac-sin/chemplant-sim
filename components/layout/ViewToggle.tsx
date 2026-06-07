"use client";
import { useTranslation } from "react-i18next";
import { useSimStore } from "@/store/simStore";

/** Switch the scene area between the 3D model and the 2D P&ID schematic. */
export function ViewToggle() {
  const { t } = useTranslation();
  const mode = useSimStore((s) => s.viewMode);
  const set = useSimStore((s) => s.setViewMode);
  return (
    <div className="flex overflow-hidden rounded-lg border border-edge">
      {(["3d", "pid"] as const).map((m) => (
        <button
          key={m}
          onClick={() => set(m)}
          className={`px-3 py-1.5 text-xs font-medium transition ${mode === m ? "bg-brand/20 text-brand" : "text-muted hover:bg-panel-3 hover:text-ink"}`}
        >
          {m === "3d" ? `◈ ${t("common.view3D")}` : `⊞ ${t("common.viewPid")}`}
        </button>
      ))}
    </div>
  );
}
