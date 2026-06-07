"use client";
import { useTranslation } from "react-i18next";
import { GuidedSlider } from "./GuidedSlider";
import { useActiveConfig, useSimStore } from "@/store/simStore";
import { useSimulationStore } from "@/store/simulationStore";
import type { EquipmentId } from "@/lib/simulation/types";

// For the live CSTR, map a unit → its primary equipment so the 3D ring follows chip clicks.
const CSTR_UNIT_EQUIP: Record<string, EquipmentId> = {
  cstrReactor: "R-101",
  cstrFeed: "P-101",
  cstrColumn: "C-101",
};

export function ParameterPanel() {
  const { t } = useTranslation();
  const config = useActiveConfig();
  const params = useSimStore((s) => s.params[config.id]);
  const setParam = useSimStore((s) => s.setParam);
  const reset = useSimStore((s) => s.resetParams);
  const selectedUnitId = useSimStore((s) => s.selectedUnitId);
  const setUnit = useSimStore((s) => s.setSelectedUnit);
  const controllers = useSimStore((s) => s.controllers);

  const unit = config.units.find((u) => u.id === selectedUnitId) ?? config.units[0];
  const unitParams = config.params.filter((p) => unit.paramIds.includes(p.id));
  // params currently being driven by a PID loop in Auto → their slider is read-only
  const autoMv = new Set((config.loops ?? []).filter((l) => controllers[l.id]?.auto).map((l) => l.mv));

  const selectUnit = (id: string) => {
    setUnit(id);
    if (config.live && CSTR_UNIT_EQUIP[id]) useSimulationStore.getState().selectEquipment(CSTR_UNIT_EQUIP[id]);
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-semibold text-ink">{t("common.parameters")}</h3>
          <p className="text-[11px] text-muted">{t("common.parametersSub")}</p>
        </div>
        <button className="btn px-2 py-1 text-xs" onClick={() => reset(config.id)} title={t("common.resetDefaults")}>
          ⟳ {t("common.reset")}
        </button>
      </div>

      {/* unit selector chips */}
      <div className="flex flex-wrap gap-1.5 border-b border-edge px-3 py-2">
        {config.units.map((u) => {
          const on = u.id === unit.id;
          return (
            <button
              key={u.id}
              onClick={() => selectUnit(u.id)}
              className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                on ? "border-brand bg-brand/15 text-brand" : "border-edge text-muted hover:border-brand/40 hover:text-ink"
              }`}
            >
              {t(`unit.${u.id}.name`)}
            </button>
          );
        })}
      </div>

      {/* "how it works" explainer for the selected unit */}
      <div className="border-b border-edge bg-panel-2/40 px-3 py-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
          <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-brand/50 text-[9px]">i</span>
          {t("common.howItWorks")}
        </div>
        <p className="text-xs leading-relaxed text-ink/80">{t(`unit.${unit.id}.how`)}</p>
      </div>

      {/* sliders for this unit only */}
      <div className="space-y-1 p-3">
        {unitParams.map((def) => (
          <GuidedSlider key={def.id} def={def} value={params[def.id]} onChange={(v) => setParam(config.id, def.id, v)} disabled={autoMv.has(def.id)} />
        ))}
      </div>
    </section>
  );
}
